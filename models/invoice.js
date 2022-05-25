/**
 * Invoice Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var InvoiceSchema = new Schema({
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    paymentType: {type: String, required: true},
    subtotal: { type: Number, required: true},
    total: { type: Number, required: true},
    addon: { type: Number },
    discount: { type: Number },
    remark: { type: String },
    delFlag: { type: Boolean, index: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);