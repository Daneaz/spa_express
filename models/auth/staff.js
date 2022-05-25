/**
 * User Data Model
 */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var StaffSchema = new Schema({
    username   : { type: String, lowercase: true, unique: true, required: true },
    password    : { type: String, required: true },
    email       : { type: String, lowercase: true, required: true },
    mobile      : { type: Number },
    displayName : { type: String, required: true },
    role        : { type: Schema.Types.ObjectId, ref: 'StaffRole', required: true },
    leaveDays   : [
        { type: Date }
    ],
    delFlag     : { type: Boolean, index: true, default: false }
}, { timestamps: true });
//UserSchema.path('updatedAt').index({ expires: 120 });

module.exports = mongoose.model('Staff', StaffSchema );