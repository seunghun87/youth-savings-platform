const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { syncProducts } = require('../services/finlifeService');
const { syncOntongPolicies } = require('../services/ontongService');
const { syncLimiter } = require('../middleware/rateLimiter');

// 상품 목록 화면용. 기간별 옵션이 있으면 그중 최고금리를, 없으면 base_rate를 대표금리로 노출한다.
function maxRate(p) {
  if (Array.isArray(p.options) && p.options.length > 0) {
    return Math.max(...p.options.map(o => o.rate));
  }
  return Number(p.base_rate);
}

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('savings_product').select('*');
    if (error) throw error;

    const products = data
      .map(p => ({
        id: p.id,
        name: p.name,
        bank: p.bank,
        product_type: p.product_type,
        rate: maxRate(p),
        min_age: p.min_age,
        max_age: p.max_age,
        min_period: p.min_period,
        max_period: p.max_period,
        income_limit: p.income_limit,
        monthly_limit: p.monthly_limit,
        min_monthly_amount: p.min_monthly_amount,
        contribution_type: p.contribution_type || 'flexible',
        payment_frequency: p.payment_frequency || 'monthly',
        installment_step_amount: p.installment_step_amount,
        category: p.category,
        description: p.description,
        income_condition: p.income_condition,
        apply_url: p.apply_url,
        source: p.source,
      }))
      .sort((a, b) => b.rate - a.rate);

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// STEP4: finlife 인증키 설정 후 사용 가능
router.post('/sync', syncLimiter, async (req, res, next) => {
  try {
    const count = await syncProducts();
    res.json({ message: `시중 상품 동기화 완료: ${count}개 저장됨` });
  } catch (err) {
    next(err);
  }
});

// 온통청년 청년정책 동기화. ONTONG_API_KEY 설정 후 사용 가능
router.post('/sync-ontong', syncLimiter, async (req, res, next) => {
  try {
    const count = await syncOntongPolicies();
    res.json({ message: `청년정책 동기화 완료: ${count}개 저장됨` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
