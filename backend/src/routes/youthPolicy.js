const express = require('express');
const router = express.Router();
const { syncYouthPolicies, listYouthPolicies } = require('../services/youthPolicyService');
const { syncLimiter } = require('../middleware/rateLimiter');

// STEP: 온통청년 인증키(.env의 YOUTH_POLICY_API_KEY) 설정 후 사용 가능
router.post('/sync', syncLimiter, async (req, res, next) => {
  try {
    const count = await syncYouthPolicies();
    res.json({ message: `청년정책 동기화 완료: ${count}건 저장됨` });
  } catch (err) {
    next(err);
  }
});

// 별도 탭용 목록 조회. ?age=25&income=3000&bracket=3&keyword=주거 형태로 필터링 (income 단위: 만원)
router.get('/', async (req, res, next) => {
  try {
    const age = req.query.age !== undefined ? Number(req.query.age) : null;
    const personalIncome = req.query.income !== undefined ? Number(req.query.income) : null;
    const incomeBracket = req.query.bracket !== undefined ? Number(req.query.bracket) : null;
    const keyword = req.query.keyword || null;
    const policies = await listYouthPolicies({ age, personalIncome, incomeBracket, keyword });
    res.json(policies);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
