/**
 * Appointment Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AppointmentSchema = new Schema({
    bookings: [
        { type: Schema.Types.ObjectId, ref: 'Booking', required: true }
    ],
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    checkout: { type: Boolean, default: false },
    bookingDate: { type: Date },
    delFlag: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
