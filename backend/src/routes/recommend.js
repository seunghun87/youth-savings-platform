const express = require('express');
const router = express.Router();
const { recommend } = require('../controllers/recommendController');
const { validateRecommendInput } = require('../middleware/validator');

// POST /api/recommend
router.post('/', validateRecommendInput, recommend);

module.exports = router;
