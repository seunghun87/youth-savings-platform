const recommendService = require('../services/recommendService');

async function recommend(req, res, next) {
  try {
    const { monthly_amount, period_months, age, personal_income, income_bracket } = req.body;

    const results = await recommendService.getRecommendations({
      monthly_amount,
      period_months,
      age,
      personal_income,
      income_bracket,
    });

    if (results.length === 0) {
      return res.status(200).json({
        message: '조건에 맞는 상품이 없습니다. 조건을 조정해 주세요.',
        data: [],
      });
    }

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = { recommend };
