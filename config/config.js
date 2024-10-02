require('dotenv').config();

const config = {
    mongodb: {
        uri: process.env.MONGODB_URI,
        database: process.env.MONGODB_DATABASE
    },
    sites: {
        n11: {
            baseUrl: "https://www.n11.com",
            searchUrl: "https://www.n11.com/arama?q=macbook+air+m2",
            selectors: {
                productList: '.list-ul .columnContent',
                productName: '.productName',
                productPrice: '.newPrice',
                productDetailUrl: 'a',
                seller: '.sellerNickName',
            },
        },
        hepsiburada: {
            baseUrl: "https://www.hepsiburada.com",
            searchUrl: "https://www.hepsiburada.com/ara?q=macbook+air+m2",
            selectors: {
                productList: 'ul.productListContent-frGrtf5XrVXRwJ05HUfU div.moria-ProductCard-joawUM',
                productName: '.moria-ProductCard-bBDoAL',
                productPrice: '.moria-ProductCard-fHiOwt',
                productDetailUrl: 'a',
                seller: '.W5OUPzvBGtzo9IdLz4Li',
            },
        },
        trendyol: {
            baseUrl: "https://www.trendyol.com",
            searchUrl: "https://www.trendyol.com/sr?wc=103108&q=macbook+air+m2",
            selectors: {
                productList: '.prdct-cntnr-wrppr .p-card-chldrn-cntnr',
                productName: '.prdct-desc-cntnr-ttl-w',
                productPrice: '.prc-box-dscntd',
                productDetailUrl: 'a',
                seller: '.seller-name-text',
            },
        },
    },
};

module.exports = config;
