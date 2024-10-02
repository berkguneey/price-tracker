require('dotenv').config();
const express = require('express');
const cron = require('node-cron');

const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const { scrapeProducts } = require('./services/scraperService');
const config = require('./config/config');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * @function connectDB
 * @description Establishes a connection to the MongoDB database.
 */
connectDB();

// Middleware
app.use(express.json());

/**
 * @function productRoutes
 * @description Routes for product-related API endpoints.
 */
app.use('/api', productRoutes);

/**
 * @function cron.schedule
 * @description Schedules a cron job to scrape products every 6 hours.
 * This job clears the existing products in the database and initiates the scraping process for each site defined in the configuration.
 */
cron.schedule('0 */6 * * *', async () => {
    try {
        logger.info('Scraping process is starting...');
        await Product.deleteMany({});
        const siteKeys = Object.keys(config.sites);
        for (const siteKey of siteKeys) {
            const site = config.sites[siteKey];
            await scrapeProducts(site);
        }
        logger.info('Scraping process completed.');
    } catch (error) {
        logger.error("Scraping error:", error);
    }
});

/**
 * @function app.listen
 * @description Starts the Express server and listens for incoming requests on the specified port.
 * @param {number} PORT - The port on which the server will listen.
 */
app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}.`);
});
