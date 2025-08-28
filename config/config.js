require('dotenv').config();

const config = {
    mongodb: {
        uri: process.env.MONGODB_URI,
        database: process.env.MONGODB_DATABASE
    },
    sites: {
        trendyol: {
            baseUrl: "https://www.trendyol.com",
            searchUrl: "https://www.trendyol.com/sr?wc=103108&q=macbook+air+m2",
            selectors: {
                productList: 'div.p-card-wrppr',
                productName: 'h3.prdct-desc-cntnr-ttl-w',
                productPrice: {
                    discounted: 'div.price-item.discounted', // Yeni yapıya uygun seçici
                    original: 'div.price-item.lowest-price-original', // Yeni yapıya uygun seçici
                    lowestDiscounted: 'div.price-item.lowest-price-discounted', // Yeni yapıya uygun seçici
                },
                productDetailUrl: 'a.p-card-chldrn-cntnr',
                seller: 'div[data-drroot="seller-info"] .merchant-name',
            }
        },
    },
};

module.exports = config;
