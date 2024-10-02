const puppeteer = require('puppeteer');
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * Initializes a Puppeteer browser and page with the specified settings.
 * 
 * @async
 * @function initializeBrowser
 * @returns {Promise<Object>} - The browser and page objects.
 */
const initializeBrowser = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--window-size=800,600', // Lower resolution
            '--proxy-server=156.253.170.185:3128'
        ]
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Chrome',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font'].includes(resourceType)) {
            request.abort(); // Abort loading of these types of resources
        } else {
            request.continue();
        }
    });
    return { browser, page };
};

/**
 * Scrapes products from the specified site.
 * 
 * @async
 * @function scrapeProducts
 * @param {Object} site - The site configuration object containing URLs and selectors.
 * @returns {Promise<void>}
 */
const scrapeProducts = async (site) => {
    const { browser, page } = await initializeBrowser();
    logger.info(`Scraping process started: ${site.baseUrl}`);
    try {
        await page.goto(site.searchUrl, { waitUntil: 'networkidle2' });

        const productElements = await page.$$(site.selectors.productList);
        const products = await Promise.all(productElements.map(element => scrapeProduct(element, site, browser)));

        await saveProductsToDB(products);
        logger.info(`Scraping process completed: ${site.baseUrl}`);
    } catch (error) {
        logger.error("Scraping error:", error);
    } finally {
        await browser.close();
    }
};

/**
 * Scrapes product details from a product element.
 * 
 * @async
 * @function scrapeProduct
 * @param {Object} element - The product element to scrape.
 * @param {Object} site - The site configuration object containing selectors.
 * @param {Object} browser - The Puppeteer browser instance.
 * @returns {Promise<Object>} - The scraped product details.
 */
const scrapeProduct = async (element, site, browser) => {
    const productNameElement = await element.$(site.selectors.productName);
    const productPriceElement = await element.$(site.selectors.productPrice);
    const productDetailUrlElement = await element.$(site.selectors.productDetailUrl);
    const sellerElement = await element.$(site.selectors.seller);

    const productName = productNameElement ? await productNameElement.evaluate(el => el.innerText.replace(/\s+/g, ' ').trim()) : 'N/A';
    const productPrice = productPriceElement ? await productPriceElement.evaluate(el => el.innerText.trim()) : 'N/A';
    const productDetailUrl = productDetailUrlElement ? await productDetailUrlElement.evaluate(el => el.href) : 'N/A';
    let seller = sellerElement ? await sellerElement.evaluate(el => el.value.trim()) : 'N/A';

    if (seller === 'N/A') {
        seller = await getSellerFromDetailPage(browser, productDetailUrl, site);
    }

    return {
        name: productName,
        price: productPrice,
        detailUrl: productDetailUrl,
        seller: seller,
    };
};

/**
 * Gets the seller information from the product detail page.
 * 
 * @async
 * @function getSellerFromDetailPage
 * @param {Object} browser - The Puppeteer browser instance.
 * @param {string} url - The URL of the product detail page.
 * @param {Object} site - The site configuration object containing selectors.
 * @returns {Promise<string>} - The seller information.
 */
const getSellerFromDetailPage = async (browser, url, site) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const sellerElement = await page.$(site.selectors.seller);
    const seller = sellerElement ? await sellerElement.evaluate(el => el.innerText.trim()) : 'N/A';

    await page.close();
    return seller;
};

/**
 * Saves the scraped products to the database.
 * 
 * @async
 * @function saveProductsToDB
 * @param {Array<Object>} products - The array of scraped products.
 * @returns {Promise<void>}
 */
const saveProductsToDB = async (products) => {
    Product.insertMany(products);
    logger.info(`${products.length} products saved to DB.`);
};

module.exports = { scrapeProducts };