/**
 * Client Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ClientSchema = new Schema({
    mobile      : { type: Number, unique: true, required: true },
    password    : { type: String },
    email       : { type: String, lowercase: true },
    displayName : { type: String, required: true },
    birthday    : { type: Date },
    gender      : { type: String, },
    nric        : { type: String, },
    credit      : { type: Number, default: 0 },
    delFlag     : { type: Boolean, index: true, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema );