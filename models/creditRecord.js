/**
 * Credit Record Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var CreditRecordSchema = new Schema({
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    staff: { type: Schema.Types.ObjectId, ref: 'Staff' },
    services: [
        { type: String }
    ],
    amount: { type: Number, required: true },
    delFlag: { type: Boolean, index: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('CreditRecord', CreditRecordSchema);