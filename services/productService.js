const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * Retrieves products sorted by price.
 * 
 * @async
 * @function getProductsSortedByPrice
 * @returns {Promise<Array>} - The sorted list of products.
 */
const getProductsSortedByPrice = async () => {
    try {
        const products = await Product.find().sort({ price: 1 });
        return products;
    } catch (error) {
        logger.error("Error retrieving products sorted by price:" + error.message);
    }
};

module.exports = {
    getProductsSortedByPrice
};