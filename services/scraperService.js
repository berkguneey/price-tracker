const puppeteer = require('puppeteer');
const Product = require('../models/Product');
const logger = require('../config/logger');

// Kullanıcı ajanları ve proxy listesi
const userAgentList = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:110.0) Gecko/20100101 Firefox/110.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:110.0) Gecko/20100101 Firefox/110.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36 Edg/114.0.1823.43'
];

const proxyList = [
    'http://47.74.157.194:80',
    'http://189.202.188.149:80',
    'http://41.191.203.161:80',
    'http://188.40.57.101:80',
    'http://89.58.55.33:80'
];

// Yardımcı fonksiyonlar
const getRandomUserAgent = () => userAgentList[Math.floor(Math.random() * userAgentList.length)];
const getRandomProxy = () => proxyList[Math.floor(Math.random() * proxyList.length)];
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Browser başlatma
 */
const initializeBrowser = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });

    return { browser, page };
};

/**
 * Captcha kontrolü
 */
const checkForCaptcha = async (page, browser) => {
    const isCaptchaDetected = await page.evaluate(() => {
        const captchaInput = document.querySelector('input[name="captcha"]');
        const verifyText = Array.from(document.querySelectorAll('*')).some(
            el => el.innerText && el.innerText.includes('Verifying')
        );
        return captchaInput !== null || verifyText;
    });

    if (isCaptchaDetected) {
        logger.warn('Captcha detected, closing browser.');
        await browser.close();
        return true;
    }
    return false;
};

// Sayfa kaydırma (scroll)
const autoScroll = async (page) => {
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollAttempts = 0; // Maksimum scroll denemesi

    logger.info(`Initial page height: ${currentHeight}`); // İlk sayfa yüksekliğini logla

    while (scrollAttempts < 20) { // Maksimum 20 kaydırma denemesi
        previousHeight = currentHeight;

        // Sayfayı küçük adımlarla kaydır
        await page.evaluate(() => {
            window.scrollBy(0, 500); // 500 piksel kaydır
            window.dispatchEvent(new Event('scroll')); // Scroll olayını tetikle
        });

        logger.info(`Scrolled down 500px. Waiting for content to load...`); // Kaydırma işlemini logla

        // Yeni ürünlerin yüklenmesi için bekle
        await delay(3000); // 3 saniye bekle

        // Sayfa yüksekliğini tekrar kontrol et
        currentHeight = await page.evaluate(() => document.body.scrollHeight);

        logger.info(`Current page height: ${currentHeight}, Previous height: ${previousHeight}`); // Sayfa yüksekliğini logla

        // Eğer sayfa yüksekliği değişmiyorsa, kaydırma işlemini sonlandır
        if (previousHeight === currentHeight) {
            scrollAttempts++;
            logger.info(`No change in page height. Attempt ${scrollAttempts}/20`); // Değişiklik yoksa logla
        } else {
            scrollAttempts = 0; // Eğer yükleme olduysa deneme sayısını sıfırla
            logger.info(`Page height increased. Continuing to scroll...`); // Yükleme olduysa logla
        }
    }

    // Scroll işlemi tamamlandıktan sonra ekstra bekleme
    logger.info(`Scroll completed. Final page height: ${currentHeight}`); // Scroll işleminin tamamlandığını logla
    await delay(3000); // 3 saniye bekle
};

/**
 * Ürün bilgisi çekme
 */
const scrapeProduct = async (element, site, browser) => {
    await delay(Math.floor(Math.random() * 2000) + 1000);

    const productName = await element.$eval(site.selectors.productName, el => el.innerText.trim()).catch(() => 'N/A');
    let discountedPrice = null;
    let originalPrice = 'N/A';

    try {
        discountedPrice = await element.$eval(site.selectors.productPrice.discounted, el => el.innerText.trim()).catch(() => null);
        originalPrice = await element.$eval(site.selectors.productPrice.original, el => el.innerText.trim()).catch(() => 'N/A');

        if (!discountedPrice) {
            discountedPrice = await element.$eval(site.selectors.productPrice.lowestDiscounted, el => el.innerText.trim()).catch(() => null);
        }
    } catch (error) {
        logger.warn(`Price scrape failed for product: ${productName}, Error: ${error.message}`);
    }

    const productDetailUrl = await element.$eval(site.selectors.productDetailUrl, el => el.getAttribute('href')).catch(() => 'N/A');
    const fullDetailUrl = productDetailUrl.startsWith('https') ? productDetailUrl : `${site.baseUrl}${productDetailUrl}`;
    const productPrice = discountedPrice || originalPrice;

    const existingProduct = await Product.findOne({ detailUrl: fullDetailUrl });
    let seller = 'N/A';

    if (existingProduct) {
        if (existingProduct.price !== productPrice) {
            seller = await getSellerFromDetailPage(browser, fullDetailUrl, site);
        } else {
            seller = existingProduct.seller;
        }
    } else {
        seller = await getSellerFromDetailPage(browser, fullDetailUrl, site);
    }

    return { name: productName, price: productPrice, detailUrl: fullDetailUrl, seller };
};

/**
 * Satıcı bilgisi çekme
 */
const getSellerFromDetailPage = async (browser, url, site) => {
    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        await page.waitForSelector(site.selectors.seller, { timeout: 30000 });

        const seller = await page.$eval(site.selectors.seller, el => el.innerText.trim());
        await page.close();
        return seller;
    } catch (error) {
        logger.warn(`Seller scrape failed for URL: ${url}, Error: ${error.message}`);
        await page.close();
        return 'N/A';
    }
};

/**
 * DB’ye kaydetme (duplicate engellemek için upsert)
 */
const saveProductsToDB = async (products) => {
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const product of products) {
        const existingProduct = await Product.findOne({ detailUrl: product.detailUrl });

        if (existingProduct) {
            if (existingProduct.price !== product.price || existingProduct.seller !== product.seller) {
                existingProduct.price = product.price;
                existingProduct.seller = product.seller;
                existingProduct.updatedAt = new Date();
                await existingProduct.save();
                totalUpdated++;
                logger.info(`Product updated: ${product.name}`);
            } else {
                logger.info(`No changes for product: ${product.name}`);
            }
        } else {
            const newProduct = new Product(product);
            await newProduct.save();
            totalInserted++;
            logger.info(`New product added: ${product.name}`);
        }
    }

    logger.info(`Toplam eklenen ürün sayısı: ${totalInserted}`);
    logger.info(`Toplam güncellenen ürün sayısı: ${totalUpdated}`);
};

/**
 * Ana scraping fonksiyonu
 */
const scrapeProducts = async (site, retries = 3) => {
    logger.info(`Scraping started: ${site.baseUrl}`);
    let attempt = 0;

    while (attempt < retries) {
        let browser;
        try {
            const { browser: browserInstance, page } = await initializeBrowser();
            browser = browserInstance;

            await page.setUserAgent(getRandomUserAgent());
            await page.goto(site.searchUrl, { waitUntil: 'networkidle2' });

            const isCaptcha = await checkForCaptcha(page, browser);
            if (isCaptcha) return;

            // Sayfayı aşağı kaydırarak tüm ürünlerin yüklenmesini sağla
            logger.info('Starting scroll...');
            await autoScroll(page); // Scroll işleminin tamamen bitmesini bekle
            logger.info('Scroll completed.');

            // Scroll işlemi tamamlandıktan sonra ürünleri seç
            const productElements = await page.$$(site.selectors.productList);
            logger.info(`Toplam ürün sayısı: ${productElements.length}`);

            // Ürünleri detaylı olarak işleme
            const products = await Promise.all(
                productElements.map(el => scrapeProduct(el, site, browser))
            );

            // Ürünleri veritabanına kaydet
            await saveProductsToDB(products);

            logger.info(`Scraping completed: ${site.baseUrl}`);
            await browser.close();
            return;
        } catch (error) {
            logger.error(`Scraping error (attempt ${attempt + 1}): ${error.message}`);
            attempt++;
            if (attempt === retries) {
                logger.error('All attempts failed. Aborting...');
            }
            if (browser) await browser.close();
        }
    }
};

module.exports = { scrapeProducts };
