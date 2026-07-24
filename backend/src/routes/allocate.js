const express = require('express');
const router = express.Router();
const { recommendRules, validate } = require('../middleware/validate');
const { allocateSavings } = require('../services/allocationService');
const { recommendLimiter } = require('../middleware/rateLimiter');

router.post('/', recommendLimiter, recommendRules, validate, async (req, res, next) => {
  try {
    const { monthly_amount, period_months, age, personal_income } = req.body;
    const result = await allocateSavings({ monthly_amount, period_months, age, personal_income });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
