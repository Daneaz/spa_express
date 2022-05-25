/**
 * Category Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var CategorySchema = new Schema({
    name: { type: String, unique: true, required: true },
    delFlag: { type: Boolean, index: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);