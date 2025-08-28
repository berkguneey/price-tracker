require('dotenv').config();
const express = require('express');
const cron = require('node-cron');

const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const { scrapeProducts } = require('./services/scraperService');
const config = require('./config/config');
const logger = require('./config/logger');
const Product = require('./models/Product'); // Eksikti → eklendi

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * DB bağlantısı
 */
connectDB();

// Middleware
app.use(express.json());

/**
 * Ürün API endpointleri
 */
app.use('/api', productRoutes);

/**
 * Scraping işlemini başlatan fonksiyon
 */
const startScraping = async () => {
    try {
        logger.info('Scraping started...');
        await Product.deleteMany({}); // Eski ürünleri temizle
        const siteKeys = Object.keys(config.sites);

        for (const siteKey of siteKeys) {
            const site = config.sites[siteKey];
            await scrapeProducts(site); // Her site için scraping işlemi
        }

        logger.info('Scraping completed.');
    } catch (error) {
        logger.error("Scraping error:", error);
    }
};

/**
 * Her 6 saatte bir scraping
 */
cron.schedule('0 */6 * * *', async () => {
    await startScraping();
});

/**
 * Scraping işlemini manuel başlatan endpoint
 */
app.get('/api/scrape', async (req, res) => {
    try {
        await startScraping();
        res.status(200).json({ message: 'Scraping started successfully.' });
    } catch (error) {
        logger.error("Manual scraping error:", error);
        res.status(500).json({ message: 'Scraping failed.', error: error.message });
    }
});

/**
 * Express server
 */
app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}.`);
});
