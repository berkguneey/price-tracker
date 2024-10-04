const puppeteer = require('puppeteer');
const Product = require('../models/Product');
const logger = require('../config/logger');

const userAgentList = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:110.0) Gecko/20100101 Firefox/110.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:110.0) Gecko/20100101 Firefox/110.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36 Edg/114.0.1823.43'
];

const getRandomUserAgent = () => {
    return userAgentList[Math.floor(Math.random() * userAgentList.length)];
};

/**
 * Initializes a Puppeteer browser and page with the specified settings.
 * 
 * @async
 * @function initializeBrowser
 * @returns {Promise<Object>} - The browser and page objects.
 */
const initializeBrowser = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--window-size=800,600' // Lower resolution
            // '--proxy-server=209.200.246.243:9595'
        ]
    });
    const page = await browser.newPage();
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
 * Evaluates the page to determine if human verification is required.
 * Checks for the presence of a captcha input field or text indicating verification.
 *
 * @async
 * @function checkForCaptcha
 * @param {Object} page - The Puppeteer page instance.
 * @param {Object} browser - The Puppeteer browser instance.
 * @returns {Promise<boolean>} A promise that resolves to true if human verification is detected, otherwise false.
 */
const checkForCaptcha = async (page, browser) => {
    const isHumanVerify = await page.evaluate(() => {
        const captchaInput = document.querySelector('input[name="captcha"]');
        const verifyText = Array.from(document.querySelectorAll('*')).some(el => el.innerText && el.innerText.includes('Verifying'));
        return captchaInput !== null || verifyText;
    });

    if (isHumanVerify) {
        logger.warn('Human verification detected. Aborting scraping process.');
        await browser.close();
        return true;
    }
    return false;
};

/**
 * Scrapes products from the specified site.
 * 
 * @async
 * @function scrapeProducts
 * @param {Object} site - The site configuration object containing URLs and selectors.
 * @returns {Promise<void>}
 */
const scrapeProducts = async (site, retries = 3) => {
    logger.info(`Scraping process started: ${site.baseUrl}`);
    let attempt = 0;

    while (attempt < retries) {
        try {
            const { browser, page } = await initializeBrowser();
            await page.setUserAgent(getRandomUserAgent());
            await page.goto(site.searchUrl, { waitUntil: 'networkidle2' });

            const isHumanVerify = await checkForCaptcha(page, browser);
            if (isHumanVerify) return;

            const productElements = await page.$$(site.selectors.productList);

            const pLimit = (await import('p-limit')).default;
            const limit = pLimit(10);
            const products = await Promise.all(
                productElements.map(element => limit(() => scrapeProduct(element, site, browser)))
            );

            await saveProductsToDB(products);
            logger.info(`Scraping process completed: ${site.baseUrl}`);
            await browser.close();
            return;
        } catch (error) {
            logger.error(`Scraping error on attempt ${attempt + 1}:`, error);
            attempt++;
            if (attempt === retries) {
                logger.error('All attempts failed. Aborting...');
            } else {
                logger.log(`Retrying (${attempt}/${retries})...`);
            }
            await browser.close();
        }
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
    await page.setUserAgent(getRandomUserAgent());

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
    await Product.insertMany(products);
    logger.info(`${products.length} products saved to DB.`);
};

module.exports = { scrapeProducts };