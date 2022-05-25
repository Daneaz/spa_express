var express = require('express');
var router = express.Router();
let createError = require('http-errors');

let Staff = require('../../models/auth/staff');
let Client = require('../../models/auth/client');
let CreditRecord = require('../../models/creditRecord');
let logger = require('../../services/logger');

/* PATCH update add credit. */
router.post('/addcredit/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.creditRecordMgt.create) { next(createError(403)); return; }

        //load data from db
        let client = await Client.findOne({ "_id": reqe.params.id, "delFlag": false })
        client.credit = client.credit + parseFloat(reqe.body.credit);

        new CreditRecord({ staff: staff.id, client: client._id, amount: reqe.body.credit }).save().then(async (creditRecord) => {
            creditRecord.staff = staff
            let doc = await client.save();
            let rsObj = { ok: "Credit has been added.", client: client, creditRecord: creditRecord };
            logger.audit("Credit Record Mgt", "Add Credit", doc._id, staff.id, `Credit has been added by ${staff.displayName}`);
            res.json(rsObj);
        })

    } catch (err) {
        res.status(400).json({ error: `Cannot add credit, ${err.message}` });
    }

});

module.exports = router;
