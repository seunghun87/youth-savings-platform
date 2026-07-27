const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { syncProducts } = require('../services/finlifeService');
const { syncLimiter, publicReadLimiter } = require('../middleware/rateLimiter');
const { requireSyncSecret } = require('../middleware/requireSyncSecret');
const { isYouthJoinable } = require('../services/productRules');

// 상품 목록 화면용. 기간별 옵션이 있으면 그중 최고금리를, 없으면 base_rate를 대표금리로 노출한다.
function maxRate(p) {
  if (Array.isArray(p.options) && p.options.length > 0) {
    return Math.max(...p.options.map(o => o.rate));
  }
  return Number(p.base_rate);
}

router.get('/', publicReadLimiter, async (req, res, next) => {
  try {
    // 기본은 청년 개인이 가입할 수 없는 상품(자녀·반려동물·미성년 대상)을 제외한다.
    // ?include_restricted=true 를 주면 그것들도 함께 내려보내며,
    // 호출부가 join_member로 조건을 확인해 별도 코너에 보여줄 수 있다.
    const includeRestricted = req.query.include_restricted === 'true';
    const { data, error } = await supabase
      .from('savings_product')
      .select('*')
      .eq('available_for_signup', true);
    if (error) throw error;

    const products = data
      .filter(p => includeRestricted || isYouthJoinable(p))
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
        source: p.source,
        // 가입 제한 정보. include_restricted로 받아온 상품을 호출부가 구분하고
        // "어떤 조건이 붙는지"를 사용자에게 보여줄 수 있도록 함께 내려보낸다.
        join_deny: p.join_deny ?? null,
        join_member: p.join_member ?? null,
        special_note: p.special_note ?? null,
      }))
      .sort((a, b) => b.rate - a.rate);

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// STEP4: finlife 인증키 설정 후 사용 가능
router.post('/sync', syncLimiter, requireSyncSecret, async (req, res, next) => {
  try {
    const count = await syncProducts();
    res.json({ message: `시중 상품 동기화 완료: ${count}개 저장됨` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
