const express = require('express');
const { getProductsSortedByPrice } = require('../controllers/productController');

const router = express.Router();

/**
 * GET /productsSortedByPrice
 * @function
 * @name getProductsSortedByPrice
 * @memberof module:ProductRoutes
 * @description Retrieves all products from the database sorted by price in ascending order.
 * @route {GET} /productsSortedByPrice
 * @returns {Array<Object>} 200 - An array of products sorted by price, each containing name, price, and seller.
 * @throws {Error} 500 - If there is an error during the operation.
 */
router.get('/productsSortedByPrice', getProductsSortedByPrice);

module.exports = router;
