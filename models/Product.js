const mongoose = require('mongoose');

/**
 * Product Schema
 * 
 * This schema defines the structure of a product document in the database.
 * It includes fields for the product's name, price, detail URL, seller, and timestamps.
 */
const ProductSchema = new mongoose.Schema({
  /**
   * The name of the product.
   * Example: "Apple MacBook Air M2"
   * @type {String}
   * @required
   */
  name: { type: String, required: true },

  /**
   * The creation date of the product document.
   * Automatically set to the current date when the document is created.
   * @type {Date}
   * @default Date.now
   */
  createdAt: { type: Date, default: Date.now },

  /**
   * The price of the product.
   * Example: "$999.99"
   * @type {String}
   * @required
   */
  price: { type: String, required: true },

  /**
   * The URL for the product's detail page.
   * Example: "https://www.example.com/product/12345"
   * @type {String}
   * @required
   */
  detailUrl: { type: String, required: true },

  /**
   * The seller of the product.
   * Example: "BestSeller Inc."
   * @type {String}
   * @required
   */
  seller: { type: String, required: true },

  /**
   * The last updated date of the product document.
   * Automatically set to the current date when the document is updated.
   * @type {Date}
   * @default Date.now
   */
  updatedAt: { type: Date, default: Date.now }
});

/**
 * Product Model
 * 
 * This model is based on the ProductSchema and is used to interact with the "products" collection in the database.
 * 
 * @module Product
 * @returns {mongoose.Model} The mongoose model for Product.
 */
module.exports = mongoose.model('Product', ProductSchema);