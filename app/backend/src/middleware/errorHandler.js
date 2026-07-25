function errorHandler(err, req, res, next) {
  console.error('[서버 오류]', err);
  const status = err.status || 500;
  // status를 직접 지정하지 않은 예외(500, 예: DB 에러)만 일반 메시지로 가려서
  // 내부 구현 정보 노출을 막는다. 401/503 등 의도적으로 지정한 상태코드는 실제 메시지를 노출한다.
  const message = status === 500 ? '서버 오류가 발생했습니다' : (err.message || '요청 처리 중 오류가 발생했습니다');
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
