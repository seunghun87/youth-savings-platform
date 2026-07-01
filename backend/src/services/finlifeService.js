const supabase = require('./supabaseClient');

const FINLIFE_BASE_URL = 'https://finlife.fss.or.kr/finlifeapi';

async function fetchPage(apiKey, topFinGrpNo, pageNo) {
  const url = `${FINLIFE_BASE_URL}/savingProductsSearch.json?auth=${apiKey}&topFinGrpNo=${topFinGrpNo}&pageNo=${pageNo}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`finlife API 오류: ${res.status}`);
  const json = await res.json();
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
    const pages = [first];
    for (let p = 2; p <= first.max_page_no; p++) {
      pages.push(await fetchPage(apiKey, grpNo, p));
    }
    for (const page of pages) {
      for (const item of page.baseList) {
        const key = `${item.fin_co_no}_${item.fin_prdt_cd}`;
        baseMap[key] = item;
      }
      for (const opt of page.optionList) {
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
    const options = optionMap[key] || [];
    if (options.length === 0) continue;

    // 기간별 최고 기본금리 기준으로 대표 옵션 선택
    const validOpts = options.filter(o => o.intr_rate !== null);
    if (validOpts.length === 0) continue;

    const bestRate = Math.max(...validOpts.map(o => o.intr_rate));
    const terms = validOpts.map(o => parseInt(o.save_trm)).filter(Boolean);

    products.push({
      name: base.fin_prdt_nm,
      bank: base.kor_co_nm,
      base_rate: bestRate,
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

  // 기존 finlife 데이터 삭제 후 재삽입
  const { error: delErr } = await supabase
    .from('savings_product')
    .delete()
    .eq('source', 'finlife');
  if (delErr) throw delErr;

  const { error: insErr } = await supabase
    .from('savings_product')
    .insert(products);
  if (insErr) throw insErr;

  return products.length;
}

module.exports = { syncProducts };
