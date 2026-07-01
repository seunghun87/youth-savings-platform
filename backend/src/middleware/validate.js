const { body, validationResult } = require('express-validator');

const recommendRules = [
  body('monthly_amount').isInt({ min: 1 }).withMessage('월 저축액은 1 이상의 정수(만원)여야 합니다'),
  body('period_months').isInt({ min: 1, max: 600 }).withMessage('목표 기간은 1~600개월이어야 합니다'),
  body('age').isInt({ min: 14, max: 100 }).withMessage('나이는 14~100 사이여야 합니다'),
  body('personal_income').isInt({ min: 0 }).withMessage('연소득은 0 이상의 정수(만원)여야 합니다'),
  body('income_bracket')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 10 })
    .withMessage('소득분위는 1~10이어야 합니다'),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

module.exports = { recommendRules, validate };
