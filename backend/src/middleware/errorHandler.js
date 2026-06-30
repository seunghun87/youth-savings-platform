function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({ message: '외부 API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
  }

  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
}

module.exports = errorHandler;
