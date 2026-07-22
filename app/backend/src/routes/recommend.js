const express = require('express');
const router = express.Router();
const { recommendRules, validate } = require('../middleware/validate');
const { getRecommendations } = require('../services/recommendService');
const { recommendLimiter } = require('../middleware/rateLimiter');

router.post('/', recommendLimiter, recommendRules, validate, async (req, res, next) => {
  try {
    const { monthly_amount, period_months, age, personal_income, income_bracket, is_homeowner, income_reported } = req.body;
    const results = await getRecommendations({
      monthly_amount,
      period_months,
      age,
      personal_income,
      income_bracket: income_bracket ?? null,
      is_homeowner,
      income_reported,
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
