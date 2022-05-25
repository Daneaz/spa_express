/**
 * Booking Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var BookingSchema = new Schema({
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    title: { type: String, required: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true },
    staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    delFlag: { type: Boolean, index: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);