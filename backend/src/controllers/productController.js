const productService = require('../services/productService');
const finlifeService = require('../services/finlifeService');

async function getProducts(req, res, next) {
  try {
    const products = await productService.getAllProducts();
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
}

async function syncFinlife(req, res, next) {
  try {
    const count = await finlifeService.syncProducts();
    res.json({ message: `${count}개 상품 동기화 완료` });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProducts, syncFinlife };
