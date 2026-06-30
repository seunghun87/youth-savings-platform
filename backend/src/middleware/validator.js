function validateRecommendInput(req, res, next) {
  const { monthly_amount, period_months, age, personal_income } = req.body;

  const errors = [];

  if (!monthly_amount || monthly_amount <= 0) errors.push('월 저축액(monthly_amount)은 0보다 커야 합니다.');
  if (!period_months || period_months <= 0) errors.push('목표 기간(period_months)은 0보다 커야 합니다.');
  if (!age || age <= 0) errors.push('나이(age)는 0보다 커야 합니다.');
  if (personal_income === undefined || personal_income === null) errors.push('연소득(personal_income)은 필수입니다.');

  if (errors.length > 0) {
    return res.status(400).json({ message: '입력 오류', errors });
  }

  next();
}

module.exports = { validateRecommendInput };
