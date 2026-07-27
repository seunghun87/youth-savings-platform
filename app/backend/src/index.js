require('./config/env');
const express = require('express');
const cors = require('cors');
const recommendRouter = require('./routes/recommend');
const productsRouter = require('./routes/products');
const userStateRouter = require('./routes/userState');
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

// Capacitor 앱(WebView)의 출처. 웹 주소가 아니라 앱 내부에서 고정으로 쓰는 값이라
// 배포 주소와 무관하게 항상 허용한다. (Android는 capacitor.config.json의 androidScheme,
// iOS는 기본 capacitor 스킴을 따른다)
const APP_ORIGINS = ['http://localhost', 'https://localhost', 'capacitor://localhost'];

// CORS는 출처 문자열을 정확히 비교하므로 스킴이 빠지면 매칭되지 않는다.
// Render Blueprint는 서비스 주소를 호스트명만(스킴 없이) 넘겨주고, 사람이 값을 넣을 때도
// 스킴이나 끝 슬래시를 빠뜨리기 쉬워 여기서 정규화한다.
function normalizeOrigin(value) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// CORS_ORIGIN 미설정 시 전체 허용(개발용). 운영 환경에서는 반드시 설정 권장
const allowedOrigins = process.env.CORS_ORIGIN
  ? [...process.env.CORS_ORIGIN.split(',').map(normalizeOrigin).filter(Boolean), ...APP_ORIGINS]
  : null;
if (allowedOrigins) {
  console.log('[CORS] 허용 출처:', allowedOrigins.join(', '));
}
const corsOptions = allowedOrigins ? { origin: allowedOrigins } : {};
if (!allowedOrigins) {
  console.warn('[경고] CORS_ORIGIN이 설정되지 않아 모든 출처의 요청을 허용합니다');
}
app.use(cors(corsOptions));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/recommend', recommendRouter);
app.use('/api/products', productsRouter);
app.use('/api/user-state', userStateRouter);
app.use('/api/youth-policy', youthPolicyRouter);
app.use('/api/allocate', allocateRouter);

app.use((req, res) => res.status(404).json({ error: '요청한 경로를 찾을 수 없습니다' }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`청년저축플랫폼 백엔드 실행 중: http://localhost:${PORT}`);
});
