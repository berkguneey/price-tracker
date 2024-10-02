const Product = require('../models/Product');
const logger = require('../config/logger');
const { getProductsSortedByPrice } = require('../services/productService');

jest.mock('../models/Product');
jest.mock('../config/logger');

describe('productService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should retrieve products sorted by price', async () => {
        const mockProducts = [
            { name: 'Product 1', price: 10 },
            { name: 'Product 2', price: 20 }
        ];

        Product.find.mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockProducts)
        });

        const products = await getProductsSortedByPrice();

        expect(Product.find).toHaveBeenCalled();
        expect(products).toEqual(mockProducts);
    });

    it('should log an error if retrieving products fails', async () => {
        const errorMessage = 'Database error';
        Product.find.mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error(errorMessage))
        });

        await getProductsSortedByPrice();

        expect(logger.error).toHaveBeenCalledWith(`Error retrieving products sorted by price:${errorMessage}`);
    });
});