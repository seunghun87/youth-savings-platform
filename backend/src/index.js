require('./config/env');
const express = require('express');
const cors = require('cors');
const recommendRouter = require('./routes/recommend');
const productsRouter = require('./routes/products');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/recommend', recommendRouter);
app.use('/api/products', productsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`청년저축플랫폼 백엔드 실행 중: http://localhost:${PORT}`);
});
