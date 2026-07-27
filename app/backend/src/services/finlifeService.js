const supabase = require('./supabaseClient');

const FINLIFE_BASE_URL = 'https://finlife.fss.or.kr/finlifeapi';
const PAGE_DELAY_MS = 150;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPage(apiKey, topFinGrpNo, pageNo, attempt = 1) {
  const url = `${FINLIFE_BASE_URL}/savingProductsSearch.json?auth=${apiKey}&topFinGrpNo=${topFinGrpNo}&pageNo=${pageNo}`;
  const res = await fetch(url);
  if (!res.ok) {
    // 과다 요청 시 일시적으로 5xx를 던지는 경우가 있어 1회 재시도 (온통청년 연동과 동일 전략)
    if (attempt < 2) {
      await sleep(500);
      return fetchPage(apiKey, topFinGrpNo, pageNo, attempt + 1);
    }
    throw new Error(`finlife API 오류: ${res.status} (page ${pageNo})`);
  }
  const json = await res.json();
  if (!json.result) throw new Error('finlife 응답 형식 오류: result 없음');
  if (json.result.err_cd !== '000') throw new Error(`finlife 에러: ${json.result.err_msg}`);
  return json.result;
}

async function fetchAllProducts(apiKey) {
  // 은행(020000), 저축은행(030300) 두 기관 조회
  const groups = ['020000', '030300'];
  const baseMap = {};   // fin_co_no+fin_prdt_cd → baseList 항목
  const optionMap = {}; // fin_co_no+fin_prdt_cd → optionList 항목 배열

  for (const grpNo of groups) {
    // 전 페이지를 동시에 요청하면 과다요청으로 5xx가 떨어지므로,
    // 순차 요청 + 페이지 사이 짧은 대기로 처리한다 (온통청년 연동과 동일)
    const first = await fetchPage(apiKey, grpNo, 1);
    const pages = [first];
    for (let p = 2; p <= first.max_page_no; p++) {
      await sleep(PAGE_DELAY_MS);
      pages.push(await fetchPage(apiKey, grpNo, p));
    }

    for (const page of pages) {
      for (const item of page.baseList || []) {
        const key = `${item.fin_co_no}_${item.fin_prdt_cd}`;
        baseMap[key] = item;
      }
      for (const opt of page.optionList || []) {
        const key = `${opt.fin_co_no}_${opt.fin_prdt_cd}`;
        if (!optionMap[key]) optionMap[key] = [];
        optionMap[key].push(opt);
      }
    }
  }
  return { baseMap, optionMap };
}

// 값이 없으면 공백 문자열이나 "-"로 오는 필드가 있어 trim 후 판정
function toText(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' || trimmed === '-' ? null : trimmed;
}

// 가입제한 구분(1=제한없음, 2=서민전용, 3=일부제한). 값이 이상하면 null로 두고
// 조회 시 제한없음과 동일하게 취급한다(데이터 오류로 상품이 통째로 사라지지 않게).
function toJoinDeny(value) {
  const parsed = parseInt(value, 10);
  return parsed >= 1 && parsed <= 3 ? parsed : null;
}

function buildProducts(baseMap, optionMap) {
  const products = [];

  for (const key of Object.keys(baseMap)) {
    const base = baseMap[key];
    const rawOpts = optionMap[key] || [];

    // 기간(save_trm)별로 최고 기본금리 하나만 남긴다
    // (단리/복리, 정액/자유적립식 등으로 같은 기간에 옵션이 여러 개 존재)
    const rateByTerm = {};
    for (const o of rawOpts) {
      const term = parseInt(o.save_trm, 10);
      const rate = Number(o.intr_rate);
      if (!Number.isInteger(term) || term <= 0 || !Number.isFinite(rate)) continue;
      if (rateByTerm[term] === undefined || rate > rateByTerm[term]) rateByTerm[term] = rate;
    }
    const options = Object.keys(rateByTerm)
      .map(t => ({ term: Number(t), rate: rateByTerm[t] }))
      .sort((a, b) => a.term - b.term);
    if (options.length === 0) continue;

    const terms = options.map(o => o.term);

    products.push({
      fin_co_no: base.fin_co_no,
      fin_prdt_cd: base.fin_prdt_cd,
      name: base.fin_prdt_nm,
      bank: base.kor_co_nm,
      base_rate: Math.max(...options.map(o => o.rate)), // 목록 표시용 최고 기본금리
      options,
      product_type: '시중',
      min_age: 0,
      max_age: 99,
      income_limit: null,
      min_period: Math.min(...terms),
      max_period: Math.max(...terms),
      monthly_limit: base.max_limit ? Math.round(base.max_limit / 10000) : null,
      // 가입 제한 정보. 반려동물·자녀 등 특정 조건을 요구하는 상품을 걸러내는 근거가 된다
      join_deny: toJoinDeny(base.join_deny),
      join_member: toText(base.join_member),
      special_note: [toText(base.spcl_cnd), toText(base.etc_note)].filter(Boolean).join('\n\n') || null,
      source: 'finlife',
    });
  }

  return products;
}

async function syncProducts() {
  const apiKey = process.env.FINLIFE_API_KEY;
  if (!apiKey) {
    const err = new Error('FINLIFE_API_KEY가 .env에 설정되지 않았습니다');
    err.status = 503;
    throw err;
  }

  const { baseMap, optionMap } = await fetchAllProducts(apiKey);
  const products = buildProducts(baseMap, optionMap);

  if (products.length === 0) throw new Error('가져온 상품이 없습니다');

  // 자연 키(fin_co_no+fin_prdt_cd) 기준 upsert.
  // 기존 행의 id가 유지되므로 recommendation 이력이 끊기지 않고,
  // 중간에 실패해도 기존 데이터가 삭제된 채 남는 일이 없다.
  const { error: upErr } = await supabase
    .from('savings_product')
    .upsert(products, { onConflict: 'fin_co_no,fin_prdt_cd' });
  if (upErr) throw upErr;

  // API에서 사라진(판매 종료된) 상품만 정리
  const { data: existing, error: selErr } = await supabase
    .from('savings_product')
    .select('id, fin_co_no, fin_prdt_cd')
    .eq('source', 'finlife');
  if (selErr) throw selErr;

  const liveKeys = new Set(products.map(p => `${p.fin_co_no}_${p.fin_prdt_cd}`));
  const staleIds = existing
    .filter(row => !liveKeys.has(`${row.fin_co_no}_${row.fin_prdt_cd}`))
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

module.exports = { syncProducts };
