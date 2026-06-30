const express = require('express');
const router = express.Router();
const { getProducts, syncFinlife } = require('../controllers/productController');

// GET /api/products
router.get('/', getProducts);

// POST /api/products/sync - finlife API 데이터 동기화
router.post('/sync', syncFinlife);

module.exports = router;
