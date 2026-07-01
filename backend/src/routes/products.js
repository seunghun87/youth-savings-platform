const express = require('express');
const router = express.Router();
const { syncProducts } = require('../services/finlifeService');

// STEP4: finlife 인증키 설정 후 사용 가능
router.post('/sync', async (req, res, next) => {
  try {
    const count = await syncProducts();
    res.json({ message: `시중 상품 동기화 완료: ${count}개 저장됨` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
