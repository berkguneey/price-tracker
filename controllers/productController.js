const productService = require('../services/productService');

/**
 * Fetches all products from the database and sorts them by price in ascending order.
 * Responds with the sorted product details, including name, price, and seller information.
 *
 * @async
 * @function getProductsSortedByPrice
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} Responds with the sorted list of products by price.
 */
const getProductsSortedByPrice = async (req, res) => {
    try {
        const products = await productService.getProductsSortedByPrice();
        const response = products.map(product => ({
            name: product.name,
            price: product.price,
            seller: product.seller
        }));
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProductsSortedByPrice
};
