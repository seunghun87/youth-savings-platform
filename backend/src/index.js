require('./config/env');
const express = require('express');
const cors = require('cors');
const recommendRouter = require('./routes/recommend');
const productsRouter = require('./routes/products');
const youthPolicyRouter = require('./routes/youthPolicy');
const allocateRouter = require('./routes/allocate');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 리버스 프록시(nginx, 클라우드 배포 등) 뒤에서 실행할 때 TRUST_PROXY=1 설정.
// 미설정 시 rate limit이 프록시 IP 기준으로 묶여 전체 사용자가 하나로 계산된다
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// CORS_ORIGIN 미설정 시 전체 허용(개발용). 운영 환경에서는 반드시 설정 권장
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(',').map(o => o.trim()) }
  : {};
if (!process.env.CORS_ORIGIN) {
  console.warn('[경고] CORS_ORIGIN이 설정되지 않아 모든 출처의 요청을 허용합니다');
}
app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/recommend', recommendRouter);
app.use('/api/products', productsRouter);
app.use('/api/youth-policy', youthPolicyRouter);
app.use('/api/allocate', allocateRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`청년저축플랫폼 백엔드 실행 중: http://localhost:${PORT}`);
});
