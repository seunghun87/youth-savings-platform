const crypto = require('node:crypto');

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireSyncSecret(req, _res, next) {
  const configured = process.env.SYNC_SECRET;
  if (!configured) {
    const error = new Error('동기화 API가 구성되지 않았습니다');
    error.status = 503;
    return next(error);
  }
  if (!safeEqual(req.get('x-sync-secret'), configured)) {
    const error = new Error('동기화 권한이 없습니다');
    error.status = 401;
    return next(error);
  }
  next();
}

module.exports = { requireSyncSecret, safeEqual };
