const mongoose = require('mongoose');

/**
 * Represents the schema for a product.
 * 
 * @typedef {Object} Product
 * @property {String} name - The name of the product.
 * @property {String} price - The price of the product.
 * @property {String} detailUrl - The URL for the product's detail page.
 * @property {String} seller - The seller of the product.
 */

const ProductSchema = new mongoose.Schema({
  /** 
   * The name of the product.
   * @type {String}
   * @required
   */
  name: { type: String, required: true },

  /** 
   * The price of the product.
   * @type {String}
   * @required
   */
  price: { type: String, required: true },

  /** 
   * The URL for the product's detail page.
   * @type {String}
   * @required
   */
  detailUrl: { type: String, required: true },

  /** 
   * The seller of the product.
   * @type {String}
   * @required
   */
  seller: { type: String, required: true }
});

/**
 * Product model based on the ProductSchema.
 * 
 * @module Product
 * @returns {mongoose.Model} The mongoose model for Product.
 */
module.exports = mongoose.model('Product', ProductSchema);
