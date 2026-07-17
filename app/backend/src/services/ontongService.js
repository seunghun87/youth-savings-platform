const supabase = require('./supabaseClient');

// 온통청년(청년정책 통합 플랫폼) 오픈 API
// 문서: https://www.youthcenter.go.kr (마이페이지 > 오픈API)
// 신규 정책 목록 조회 엔드포인트(getPlcy)를 사용한다.
const ONTONG_BASE_URL = 'https://www.youthcenter.go.kr/go/ythip/getPlcy';

// 한 번에 가져올 정책 수(신규 API 최대 100). 안전하게 100으로 둔다.
const PAGE_SIZE = 100;
// 폭주 방지용 최대 페이지 수(= 최대 100 * 200 = 20,000건). 필요 시 상향
const MAX_PAGES = 200;

// 정책 대분류명(lclsfNm) → 앱 카테고리 코드.
// 온통청년 대분류: 일자리 / 주거 / 교육 / 복지문화 / 참여권리
function mapCategory(lclsfNm) {
  const name = String(lclsfNm || '');
  if (name.includes('일자리')) return 'job';
  if (name.includes('주거')) return 'housing';
  if (name.includes('교육')) return 'education';
  if (name.includes('복지') || name.includes('문화') || name.includes('금융')) return 'welfare';
  if (name.includes('참여') || name.includes('권리')) return 'participation';
  return 'welfare'; // 미분류 정책은 금융·복지·문화로 귀속
}

// 문자열/숫자 혼재 값을 정수로. 빈 값·범위 밖은 fallback
function toAge(value, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0 || n > 150) return fallback;
  return n;
}

function cleanText(value) {
  const s = String(value == null ? '' : value).trim();
  return s.length > 0 ? s : null;
}

// 한 페이지 조회. 신규 API 응답 구조:
// { resultCode, resultMessage, result: { pagging: { totCount, pageNum, pageSize }, youthPolicyList: [...] } }
async function fetchPage(apiKey, pageNum) {
  const params = new URLSearchParams({
    apiKeyNm: apiKey,
    rtnType: 'json',
    pageType: '1',
    pageNum: String(pageNum),
    pageSize: String(PAGE_SIZE),
  });
  const url = `${ONTONG_BASE_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`온통청년 API 오류: ${res.status}`);

  const json = await res.json();
  const result = json.result || json;
  if (!result) throw new Error('온통청년 응답 형식 오류: result 없음');

  const list = result.youthPolicyList || result.youthPolicyLists || [];
  const pagging = result.pagging || {};
  const totCount = Number(pagging.totCount || 0);
  return { list, totCount };
}

async function fetchAllPolicies(apiKey) {
  const first = await fetchPage(apiKey, 1);
  const all = [...first.list];

  const totalPages = Math.min(
    MAX_PAGES,
    Math.max(1, Math.ceil(first.totCount / PAGE_SIZE)),
  );

  // 나머지 페이지 순차 조회(공개 API 부하·rate limit 배려)
  for (let p = 2; p <= totalPages; p++) {
    const page = await fetchPage(apiKey, p);
    if (!page.list.length) break;
    all.push(...page.list);
  }
  return all;
}

// 온통청년 정책 1건 → savings_product 행.
// ⚠️ 소득기준(earnCndSeCd/earnMinAmt/earnMaxAmt/earnEtcCn)은 자연어가 섞여
//    정확한 정형화가 어렵다. 요청에 따라 소득으로는 거르지 않는다:
//    income_limit 은 항상 null(=소득 제한 없음 → 추천 시 전원 통과)로 두고,
//    원문만 income_condition 에 보존해 화면에서 안내로 노출한다.
function mapPolicyToProduct(policy) {
  const plcyNo = cleanText(policy.plcyNo);
  if (!plcyNo) return null; // 자연 키 없는 정책은 upsert 불가라 건너뜀

  const ageLimited = String(policy.sprtTrgtAgeLmtYn || '').toUpperCase() !== 'Y';
  // sprtTrgtAgeLmtYn === 'Y' 는 "연령 제한 없음"을 의미(온통청년 규격)
  const minAge = ageLimited ? toAge(policy.sprtTrgtMinAge, 0) : 0;
  const maxAge = ageLimited ? toAge(policy.sprtTrgtMaxAge, 99) : 99;

  // 소득기준 원문 조합(구분코드 + 기타 자연어). 표시용으로만 보존
  const incomeParts = [
    cleanText(policy.earnCndSeCdNm),
    cleanText(policy.earnEtcCn),
  ].filter(Boolean);
  const incomeCondition = incomeParts.length ? incomeParts.join(' · ') : null;

  return {
    plcy_no: plcyNo,
    fin_co_no: null,
    fin_prdt_cd: null,
    name: cleanText(policy.plcyNm) || '(제목 없음)',
    bank: cleanText(policy.sprvsnInstCdNm) || cleanText(policy.operInstCdNm) || '온통청년',
    base_rate: 0, // 정책 상품은 금리 없음
    options: null,
    product_type: '정책',
    category: mapCategory(policy.lclsfNm),
    description: cleanText(policy.plcyExplnCn),
    income_condition: incomeCondition,
    apply_url: cleanText(policy.aplyUrlAddr) || cleanText(policy.refUrlAddr1),
    min_age: minAge,
    max_age: Math.max(minAge, maxAge),
    income_limit: null, // 소득 필터 미적용(자연어) — 전부 통과
    min_period: 1,
    max_period: 120,
    monthly_limit: null,
    contribution_type: 'flexible',
    payment_frequency: 'monthly',
    min_monthly_amount: null,
    installment_step_amount: null,
    source: 'ontong',
  };
}

async function syncOntongPolicies() {
  const apiKey = process.env.ONTONG_API_KEY;
  if (!apiKey) {
    const err = new Error('ONTONG_API_KEY가 .env에 설정되지 않았습니다');
    err.status = 503;
    throw err;
  }

  const policies = await fetchAllPolicies(apiKey);

  // 정책번호 기준 중복 제거(뒤에 온 값으로 갱신)
  const byKey = {};
  for (const policy of policies) {
    const product = mapPolicyToProduct(policy);
    if (product) byKey[product.plcy_no] = product;
  }
  const products = Object.values(byKey);

  if (products.length === 0) throw new Error('가져온 정책이 없습니다');

  // 정책번호(plcy_no) 자연 키 기준 upsert.
  // 기존 행 id가 유지되어 saved_product/recommendation 참조가 끊기지 않는다.
  const { error: upErr } = await supabase
    .from('savings_product')
    .upsert(products, { onConflict: 'plcy_no' });
  if (upErr) throw upErr;

  // API에서 사라진(운영 종료된) 정책만 정리
  const { data: existing, error: selErr } = await supabase
    .from('savings_product')
    .select('id, plcy_no')
    .eq('source', 'ontong');
  if (selErr) throw selErr;

  const liveKeys = new Set(products.map(p => p.plcy_no));
  const staleIds = (existing || [])
    .filter(row => !liveKeys.has(row.plcy_no))
    .map(row => row.id);

  if (staleIds.length > 0) {
    const { error: delErr } = await supabase
      .from('savings_product')
      .delete()
      .in('id', staleIds);
    if (delErr) throw delErr;
  }

  return products.length;
}

module.exports = { syncOntongPolicies, mapPolicyToProduct, mapCategory };
