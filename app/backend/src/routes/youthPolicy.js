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

// 기본 응답 건수. 정책이 수천 건이라 제한 없이 내려보내면 응답이 수 MB가 된다.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// 별도 탭용 목록 조회. ?age=25&income=3000&bracket=3&keyword=주거&limit=50 형태로 필터링
// (income 단위: 만원). 나이·소득을 넘기면 자격 판정(status/reason)이 함께 내려가고,
// 충족 > 확인 필요 > 미충족 순으로 정렬된다.
router.get('/', publicReadLimiter, async (req, res, next) => {
  try {
    const age = integer(req.query.age, '나이', { min: 14, max: 120, nullable: true });
    const personalIncome = integer(req.query.income, '연소득', { min: 0, nullable: true });
    const incomeBracket = integer(req.query.bracket, '소득분위', { min: 1, max: 10, nullable: true });
    const keyword = optionalString(req.query.keyword, '검색어', 100);
    const city = optionalString(req.query.city, '거주 지역', 100);
    const limit = integer(req.query.limit, '조회 개수', { min: 1, max: MAX_LIMIT, nullable: true }) ?? DEFAULT_LIMIT;
    const result = await listYouthPolicies({ age, personalIncome, incomeBracket, keyword, limit, city });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
