const supabase = require('./supabaseClient');
const { parseRequirements } = require('./eligibilityParser');

// 온통청년(www.youthcenter.go.kr) 청년정책 정보 Open API.
const YOUTH_POLICY_BASE_URL = 'https://www.youthcenter.go.kr/go/ythip/getPlcy';
const PAGE_SIZE = 100;
const SUPABASE_PAGE_SIZE = 1000; // PostgREST 기본 응답 행 제한. .range()로 페이징해서 전량 조회

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Supabase(PostgREST)는 요청당 최대 1000행만 반환하므로,
// 1000행 이상인 youth_policy를 select('*')로 그냥 조회하면 나머지가 조용히 누락된다
async function fetchAllRows(buildQuery) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;
    all = all.concat(data);
    if (!data || data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  return all;
}

async function fetchPage(apiKey, pageNum, attempt = 1) {
  const url = `${YOUTH_POLICY_BASE_URL}?apiKeyNm=${apiKey}&pageNum=${pageNum}&pageSize=${PAGE_SIZE}&rtnType=json`;
  const res = await fetch(url);
  if (!res.ok) {
    // 동시/과다 요청 시 온통청년 서버가 일시적으로 500을 던지는 경우가 있어 1회 재시도
    if (attempt < 2) {
      await sleep(500);
      return fetchPage(apiKey, pageNum, attempt + 1);
    }
    throw new Error(`온통청년 API 오류: ${res.status} (page ${pageNum})`);
  }
  const json = await res.json();
  // resultCode는 문자열이 아닌 숫자(200)로 온다
  if (json.resultCode !== 200) {
    throw new Error(`온통청년 응답 오류: ${json.resultMessage || json.resultCode}`);
  }
  if (!json.result) throw new Error('온통청년 응답 형식 오류: result 없음');
  return json.result;
}

// 페이지가 많을 때(27+) 동시 요청하면 온통청년 서버가 과다요청으로 500을 던져
// 순차 요청 + 페이지 사이 짧은 대기로 처리한다
async function fetchAllPolicies(apiKey) {
  const first = await fetchPage(apiKey, 1);
  const totCount = first.pagging?.totCount ?? (first.youthPolicyList || []).length;
  const totalPages = Math.max(1, Math.ceil(totCount / PAGE_SIZE));

  const list = [...(first.youthPolicyList || [])];
  for (let p = 2; p <= totalPages; p++) {
    await sleep(150);
    const page = await fetchPage(apiKey, p);
    list.push(...(page.youthPolicyList || []));
  }
  return list;
}

// 나이 제한 없는 정책은 min/max age가 빈 문자열이거나 "0"으로 오는 경우가 있어(2691건 중 675건) null로 정규화
function toAge(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// 값이 없으면 공백으로 채워진 문자열("        ")로 오는 필드가 있어 trim 후 판정
function toText(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' || trimmed === '-' ? null : trimmed;
}

// earnMinAmt/earnMaxAmt는 소득 조건 없는 정책도 "0"으로 내려오므로,
// 0 이하는 제한없음으로 간주해 null 처리 (savings_product.income_limit과 동일 컨벤션)
function toIncomeLimit(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildPolicies(rawList) {
  return rawList
    .filter(p => p.plcyNo && p.plcyNm)
    .map(p => ({
      plcy_no: p.plcyNo,
      name: p.plcyNm,
      description: toText(p.plcyExplnCn),
      support_content: toText(p.plcySprtCn),
      min_age: toAge(p.sprtTrgtMinAge),
      max_age: toAge(p.sprtTrgtMaxAge),
      // 만원 단위 소득 상한/하한. earnEtcCn은 "기준중위소득 100% 이하" 등 금액으로 안 떨어지는 조건의 부연설명
      income_min: toIncomeLimit(p.earnMinAmt),
      income_max: toIncomeLimit(p.earnMaxAmt),
      income_etc: toText(p.earnEtcCn),
      // 나이/소득 외 추가 자격조건 자유텍스트. 조건이 단순(나이 제한만 등)하면 비어있음
      eligibility_text: toText(p.addAplyQlfcCndCn),
      // 참여 제한 대상(자격요건과 반대 개념: 배제 조건)
      exclusion_text: toText(p.ptcpPrpTrgtCn),
      category_large: toText(p.lclsfNm),
      category_medium: toText(p.mclsfNm),
      keywords: toText(p.plcyKywdNm),
      supervising_org: toText(p.sprvsnInstCdNm),
      operating_org: toText(p.operInstCdNm),
      apply_period: [toText(p.bizPrdBgngYmd), toText(p.bizPrdEndYmd)].filter(Boolean).join('~') || toText(p.bizPrdEtcCn),
      // 실제 필드명은 aplyUrlAddr/refUrlAddr1 (d 두 개)
      apply_url: toText(p.aplyUrlAddr),
      ref_url: toText(p.refUrlAddr1),
      source: 'ontongyouth',
    }));
}

async function syncYouthPolicies() {
  const apiKey = process.env.YOUTH_POLICY_API_KEY;
  if (!apiKey) {
    const err = new Error('YOUTH_POLICY_API_KEY가 .env에 설정되지 않았습니다');
    err.status = 503;
    throw err;
  }

  const rawList = await fetchAllPolicies(apiKey);
  const policies = buildPolicies(rawList);
  if (policies.length === 0) throw new Error('가져온 정책이 없습니다');

  const { error: upErr } = await supabase
    .from('youth_policy')
    .upsert(policies, { onConflict: 'plcy_no' });
  if (upErr) throw upErr;

  // API에서 사라진(마감/종료된) 정책만 정리
  const existing = await fetchAllRows((from, to) =>
    supabase
      .from('youth_policy')
      .select('id, plcy_no')
      .eq('source', 'ontongyouth')
      .order('id')
      .range(from, to)
  );

  const liveKeys = new Set(policies.map(p => p.plcy_no));
  const staleIds = existing
    .filter(row => !liveKeys.has(row.plcy_no))
    .map(row => row.id);

  if (staleIds.length > 0) {
    const { error: delErr } = await supabase.from('youth_policy').delete().in('id', staleIds);
    if (delErr) throw delErr;
  }

  return policies.length;
}

// 3상태 자격 판정 + 미충족 사유 (설계서 2.2/2.3).
// 나이/개인소득은 구조화 필드(min_age/max_age, income_min/income_max)로 자동판정하고,
// eligibility_text는 설계서 2.3 규칙(parseRequirements)으로 분류해 bracket/personal_income은
// 값 추출 성공 시 자동판정, household/median/unknown/추출실패는 "확인 필요"로 넘긴다.
function judgePolicy(policy, age, personalIncome, incomeBracket) {
  const reasons = [];

  if (age != null) {
    const ageOk = (policy.min_age == null || age >= policy.min_age) && (policy.max_age == null || age <= policy.max_age);
    if (!ageOk) {
      const range = `${policy.min_age ?? '제한없음'}~${policy.max_age ?? '제한없음'}세`;
      reasons.push(`나이 조건 불충족 (지원연령 ${range}, 입력 ${age}세)`);
    }
  }

  if (personalIncome != null) {
    if (policy.income_max != null && personalIncome > policy.income_max) {
      reasons.push(`소득 조건 불충족 (소득상한 ${policy.income_max}만원 이하, 입력 ${personalIncome}만원)`);
    }
    if (policy.income_min != null && personalIncome < policy.income_min) {
      reasons.push(`소득 조건 불충족 (소득하한 ${policy.income_min}만원 이상, 입력 ${personalIncome}만원)`);
    }
  }

  // 설계서 2.3: 자격요건 텍스트를 조건 단위로 분류·판정
  let hasUnknown = false;
  for (const c of parseRequirements(policy.eligibility_text)) {
    if (c.type === 'age') {
      continue; // 구조화 필드로 이미 판정했으므로 중복 판정하지 않음
    }
    if (c.type === 'bracket' && c.value != null && incomeBracket != null) {
      if (incomeBracket > c.value) {
        reasons.push(`소득분위 조건 불충족 (${c.value}분위 이하, 입력 ${incomeBracket}분위)`);
      }
    } else if (c.type === 'personal_income' && c.value != null && personalIncome != null) {
      if (personalIncome > c.value) {
        reasons.push(`소득 조건 불충족 (연소득 ${c.value}만원 이하, 입력 ${personalIncome}만원)`);
      }
    } else {
      hasUnknown = true; // household/median, 값 추출 실패, 또는 분위·개인소득인데 사용자 값 미입력
    }
  }

  // 참여제한(exclusion_text)·금액으로 안 떨어지는 소득조건(income_etc)은 파싱 대상 밖 → 확인 필요
  if (policy.exclusion_text || policy.income_etc) hasUnknown = true;

  if (reasons.length > 0) {
    return { status: '미충족', reason: reasons.join(', ') };
  }
  return { status: hasUnknown ? '확인 필요' : '충족', reason: null };
}

async function listYouthPolicies({ age, keyword, personalIncome, incomeBracket } = {}) {
  const data = await fetchAllRows((from, to) =>
    supabase
      .from('youth_policy')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id') // created_at 동률(일괄 upsert)이 많아 range 페이징 안정성을 위한 2차 정렬
      .range(from, to)
  );

  // 자격 미달(미충족) 정책도 걸러내지 않고 사유와 함께 그대로 포함한다. 검색어만 필터링.
  const matched = data.filter(p =>
    !keyword || p.name.includes(keyword) || (p.keywords && p.keywords.includes(keyword))
  );

  // age/personalIncome 둘 다 없으면(사용자 컨텍스트 없이 목록만 조회) 판정 자체가 의미 없어 status를 null로 둔다
  const hasUserContext = age != null || personalIncome != null;
  return matched.map(p => {
    if (!hasUserContext) return { ...p, status: null, reason: null };
    const { status, reason } = judgePolicy(p, age, personalIncome, incomeBracket);
    return { ...p, status, reason };
  });
}

module.exports = { syncYouthPolicies, listYouthPolicies };
