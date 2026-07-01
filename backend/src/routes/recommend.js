const express = require('express');
const router = express.Router();
const { recommendRules, validate } = require('../middleware/validate');
const { getRecommendations } = require('../services/recommendService');

router.post('/', recommendRules, validate, async (req, res, next) => {
  try {
    const { monthly_amount, period_months, age, personal_income, income_bracket } = req.body;
    const results = await getRecommendations({
      monthly_amount,
      period_months,
      age,
      personal_income,
      income_bracket: income_bracket ?? null,
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
