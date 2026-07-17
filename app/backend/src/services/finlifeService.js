const supabase = require('./supabaseClient');

const FINLIFE_BASE_URL = 'https://finlife.fss.or.kr/finlifeapi';

async function fetchPage(apiKey, topFinGrpNo, pageNo) {
  const url = `${FINLIFE_BASE_URL}/savingProductsSearch.json?auth=${apiKey}&topFinGrpNo=${topFinGrpNo}&pageNo=${pageNo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`finlife API 오류: ${res.status}`);
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
    const first = await fetchPage(apiKey, grpNo, 1);
    const restPageNos = [];
    for (let p = 2; p <= first.max_page_no; p++) restPageNos.push(p);
    const rest = await Promise.all(restPageNos.map(p => fetchPage(apiKey, grpNo, p)));
    const pages = [first, ...rest];

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
