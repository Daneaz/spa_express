/**
 * Service Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ServiceSchema = new Schema({
    name: { type: String, unique: true, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    duration: { type: Number },
    price: { type: Number },
    staff: [
        { type: Schema.Types.ObjectId, ref: 'Staff', required: true }
    ],
    delFlag: { type: Boolean, index: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);