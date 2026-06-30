const express = require('express');
const router = express.Router();
const recommendRoutes = require('./recommend');
const productRoutes = require('./product');

router.use('/recommend', recommendRoutes);
router.use('/products', productRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
