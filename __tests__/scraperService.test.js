const puppeteer = require('puppeteer');
const { scrapeProducts } = require('../services/scraperService');
const Product = require('../models/Product');
const logger = require('../config/logger');

jest.mock('puppeteer');
jest.mock('../models/Product');
jest.mock('../config/logger');

describe('scraperService', () => {
    let browser, page;

    beforeEach(() => {
        page = {
            setExtraHTTPHeaders: jest.fn(),
            setRequestInterception: jest.fn(),
            on: jest.fn(),
            goto: jest.fn(),
            $: jest.fn(),
            $$: jest.fn(),
            evaluate: jest.fn(),
            close: jest.fn()
        };

        browser = {
            newPage: jest.fn().mockResolvedValue(page),
            close: jest.fn()
        };

        puppeteer.launch.mockResolvedValue(browser);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should scrape products from the specified site', async () => {
        const site = {
            searchUrl: 'http://example.com/search',
            selectors: {
                productList: '.product-list',
                productName: '.product-name',
                productPrice: '.product-price',
                productDetailUrl: '.product-detail-url',
                seller: '.seller',
            },
            baseUrl: 'http://example.com'
        };

        const productElements = [
            {
                $: jest.fn().mockResolvedValue({
                    evaluate: jest.fn().mockResolvedValue('Product 1')
                }),
                evaluate: jest.fn().mockResolvedValue('Product 1')
            },
            {
                $: jest.fn().mockResolvedValue({
                    evaluate: jest.fn().mockResolvedValue('Product 2')
                }),
                evaluate: jest.fn().mockResolvedValue('Product 2')
            }
        ];

        page.goto.mockResolvedValue();
        page.$$.mockResolvedValue(productElements);

        Product.insertMany.mockResolvedValue();

        await scrapeProducts(site);

        expect(puppeteer.launch).toHaveBeenCalled();
        expect(page.goto).toHaveBeenCalledWith(site.searchUrl, { waitUntil: 'networkidle2' });
        expect(page.$$.mock.calls.length).toBe(1);
        expect(Product.insertMany).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(`Scraping process completed: ${site.baseUrl}`);
    });

    it('should log an error if scraping fails', async () => {
        const site = {
            searchUrl: 'http://example.com/search',
            selectors: {
                productList: '.product-list',
                productName: '.product-name',
                productPrice: '.product-price',
                productDetailUrl: '.product-detail-url',
                seller: '.seller',
            },
            baseUrl: 'http://example.com'
        };

        page.goto.mockRejectedValue(new Error('Network error'));

        await scrapeProducts(site);

        expect(logger.error).toHaveBeenCalledWith('Scraping error:', expect.any(Error));
    });
});