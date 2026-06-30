const axios = require('axios');
const supabase = require('../config/database');

// 금융상품한눈에 API에서 적금 상품을 가져와 DB에 동기화
// 실제 URL·파라미터는 인증키 발급 후 2주차에 확정
async function syncProducts() {
  const apiKey = process.env.FINLIFE_API_KEY;
  const baseUrl = process.env.FINLIFE_BASE_URL;

  const response = await axios.get(`${baseUrl}/savingProductsSearch.json`, {
    params: {
      auth: apiKey,
      topFinGrpNo: '020000', // 은행권
      pageNo: 1,
    },
    timeout: 10000,
  });

  const items = response.data?.result?.baseList ?? [];

  const products = items.map((item) => ({
    name: item.fin_prdt_nm,
    bank: item.kor_co_nm,
    base_rate: parseFloat(item.intr_rate ?? 0),
    period_months: parseInt(item.save_trm ?? 12, 10),
    max_amount: null,
    product_type: '적금',
    min_age: null,
    max_age: null,
    income_limit: null,
    source: 'api',
    updated_at: new Date().toISOString(),
  }));

  if (products.length === 0) return 0;

  const { error } = await supabase
    .from('savings_product')
    .upsert(products, { onConflict: 'name,bank' });

  if (error) throw error;

  return products.length;
}

module.exports = { syncProducts };
