const express = require('express');
const router = express.Router();
const { syncYouthPolicies, listYouthPolicies } = require('../services/youthPolicyService');
const { syncLimiter, publicReadLimiter } = require('../middleware/rateLimiter');
const { requireSyncSecret } = require('../middleware/requireSyncSecret');
const { integer, optionalString } = require('../validation/userState');

// STEP: 온통청년 인증키(.env의 YOUTH_POLICY_API_KEY) 설정 후 사용 가능
router.post('/sync', syncLimiter, requireSyncSecret, async (req, res, next) => {
  try {
    const count = await syncYouthPolicies();
    res.json({ message: `청년정책 동기화 완료: ${count}건 저장됨` });
  } catch (err) {
    next(err);
  }
});

// 별도 탭용 목록 조회. ?age=25&income=3000&bracket=3&keyword=주거 형태로 필터링 (income 단위: 만원)
router.get('/', publicReadLimiter, async (req, res, next) => {
  try {
    const age = integer(req.query.age, '나이', { min: 14, max: 120, nullable: true });
    const personalIncome = integer(req.query.income, '연소득', { min: 0, nullable: true });
    const incomeBracket = integer(req.query.bracket, '소득분위', { min: 1, max: 10, nullable: true });
    const keyword = optionalString(req.query.keyword, '검색어', 100);
    const policies = await listYouthPolicies({ age, personalIncome, incomeBracket, keyword });
    res.json(policies);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
