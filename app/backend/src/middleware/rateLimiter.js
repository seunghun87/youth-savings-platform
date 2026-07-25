const rateLimit = require('express-rate-limit');

// 공개 API 남용 방지용 요청 제한
const recommendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' },
});

const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' },
});

module.exports = { recommendLimiter, syncLimiter };
