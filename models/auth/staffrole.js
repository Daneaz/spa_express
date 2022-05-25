/**
 * Staff Role Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var StaffRoleSchema = new Schema({
    name        : { type: String, unique: true, required: true },
    staffMgt     : {
        list    : { type: Boolean, index: true, default: false },
        create  : { type: Boolean, index: true, default: false },
        edit    : { type: Boolean, index: true, default: false },
        delete  : { type: Boolean, index: true, default: false }
    },
    serviceMgt  : {
        list    : { type: Boolean, index: true, default: false },
        create  : { type: Boolean, index: true, default: false },
        edit    : { type: Boolean, index: true, default: false },
        delete  : { type: Boolean, index: true, default: false }
    },
    appointmentMgt  : {
        list    : { type: Boolean, index: true, default: false },
        create  : { type: Boolean, index: true, default: false },
        edit    : { type: Boolean, index: true, default: false },
        delete  : { type: Boolean, index: true, default: false }
    },
    invoiceMgt  : {
        list    : { type: Boolean, index: true, default: false },
        create  : { type: Boolean, index: true, default: false },
        edit    : { type: Boolean, index: true, default: false },
        delete  : { type: Boolean, index: true, default: false }
    },
    creditRecordMgt: {
        list    : { type: Boolean, index: true, default: false },
        create  : { type: Boolean, index: true, default: false },
        edit    : { type: Boolean, index: true, default: false },
        delete  : { type: Boolean, index: true, default: false }
    },

    delFlag     : { type: Boolean, index: true, default: false },
}, { timestamps: true });

module.exports = mongoose.model('StaffRole', StaffRoleSchema );