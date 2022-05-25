var express = require('express');
var router = express.Router();
let createError = require('http-errors');

let Booking = require('../../models/booking');
let Appointment = require('../../models/appointment')
let Invoice = require('../../models/invoice');
let Staff = require('../../models/auth/staff');
let Client = require('../../models/auth/client');
let CreditRecord = require('../../models/creditRecord')
let auth = require('../../services/auth');
let logger = require('../../services/logger');
var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/* GET client list. */
router.get('/clients', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let rawClients = await Client.find({ "delFlag": false }).lean()
            .select({
                "email": 1,
                "mobile": 1,
                "displayName": 1,
                "nric": 1,
                "gender": 1,
                "credit": 1,
                "createdAt": 1,
                "birthday": 1,
            });

        res.send(rawClients);
    } catch (err) {
        res.status(400).json({ error: `Cannot get client list, ${err.message}` })
    }
});

/* POST Create client . */
router.post('/clients', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.create) { next(createError(403)); return; }

        let rawNewClient = reqe.body;

        let sClient = await Client.findOne({ "mobile": rawNewClient.mobile }).lean().select({ "mobile": 1 });
        if (sClient != null) { throw new Error('login name is already taken.') }

        //load main fields
        let newClient = new Client(rawNewClient);
        newClient.createdBy = staff._id;
        newClient.updatedBy = staff._id;

        // password optional
        if (rawNewClient.password)
            newClient.password = auth.hash(rawNewClient.password);

        //save client 
        let doc = await newClient.save();
        let rsObj = { ok: "Client has been created.", id: doc._id };
        logger.audit("Client Mgt", "Create", doc._id, staff.id, `A new client has been created by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot create client, ${err.message}` })
    }

});

/* GET client details by id. */
router.get('/clients/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.edit) { next(createError(403)); return; }

        //get raw data from data
        let client = await Client.findOne({ "_id": reqe.params.id, "delFlag": false }).lean()
            .select({
                "email": 1,
                "mobile": 1,
                "displayName": 1,
                "nric": 1,
                "gender": 1,
                "credit": 1,
                "birthday": 1,
            });
        res.send(client);
    } catch (err) {
        res.status(400).json({ error: `Cannot get client, ${err.message}` });
    }
});

/* PATCH update client. */
router.patch('/clients/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.edit) { next(createError(403)); return; }

        let rawNewClient = reqe.body;

        //load data from db
        let newClient = await Client.findOne({ "_id": reqe.params.id, "delFlag": false });

        newClient.updatedBy = staff._id;
        newClient.email = rawNewClient.email || newClient.email;
        newClient.displayName = rawNewClient.displayName || newClient.displayName;
        newClient.mobile = rawNewClient.mobile || newClient.mobile;
        newClient.gender = rawNewClient.gender || newClient.gender;
        newClient.nric = rawNewClient.nric || newClient.nric;
        newClient.birthday = rawNewClient.birthday || newClient.birthday;

        // password optional
        if (rawNewClient.password)
            newClient.password = auth.hash(rawNewClient.password);

        //save user 
        let doc = await newClient.save();
        let rsObj = { ok: "Client has been updated.", client: newClient };
        logger.audit("Client Mgt", "Update", doc._id, staff.id, `Client has been updated by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot update user, ${err.message}` });
    }

});

/* DELETE disable Client. */
router.delete('/clients', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.delete) { next(createError(403)); return; }

        //save user 
        let deleteId = [];
        let delObj = { updatedBy: staff._id, delFlag: true };
        reqe.body.forEach(async function (deleteObj) {
            let doc = await Client.findOneAndUpdate({ "_id": deleteObj._id, "delFlag": false }, delObj);
            deleteId.push(doc._id);
            logger.audit("Client Mgt", "Delete", doc._id, staff.id, `Client has been deleted by ${staff.displayName}`);
        });

        let rsObj = { ok: "Clients are deleted.", id: deleteId };
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot delete Client, ${err.message}` })
    }

});

/* GET client total bookings. */
router.get('/statistics/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.list) { next(createError(403)); return; }

        let bookings = await Booking.find({ delFlag: false, client: reqe.params.id })
        let invoice = await Invoice.aggregate([
            {
                $match: {
                    client: ObjectId(reqe.params.id)
                }
            },
            {
                $group:
                {
                    _id: null,
                    totalSales: { $sum: "$total" },
                    totalCompleted: { $sum: 1 }
                }
            }
        ])
        if (invoice.length > 0) {
            let rsObj = {
                ok: "Client with bookings and sales.",
                totalBookings: bookings.length,
                totalCompleted: invoice[0].totalCompleted,
                totalSales: invoice[0].totalSales
            };
            res.json(rsObj);
        } else {
            let rsObj = {
                ok: "Client with bookings.",
                totalBookings: bookings.length,
            };
            res.json(rsObj);
        }

    } catch (err) {
        res.status(400).json({ error: `Cannot get statistics, ${err.message}` })
    }
});

/* GET client total bookings. */
router.get('/appointments/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.list) { next(createError(403)); return; }

        let appointments = await Appointment.find({ delFlag: false, client: reqe.params.id, checkout: false })
            .populate({
                path: "bookings",
                populate: {
                    path: 'service',
                }
            }).populate({
                path: "bookings",
                populate: {
                    path: 'staff',
                }
            }).populate({
                path: "bookings",
                populate: {
                    path: 'client',
                }
            })

        let rsObj = { ok: "Appointment retrieved.", appointments: appointments };
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot get appointment, ${err.message}` })
    }
});

/* GET client total bookings. */
router.get('/invoices/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.invoiceMgt.list) { next(createError(403)); return; }

        let invoices = await Invoice.find({ client: reqe.params.id, delFlag: false })
            .populate({
                path: "appointment",
                populate: {
                    path: 'bookings',
                    populate: {
                        path: 'service',
                    }
                }
            }).populate({
                path: "appointment",
                populate: {
                    path: 'bookings',
                    populate: {
                        path: 'staff',
                    }
                }
            }).populate("client")

        let rsObj = { ok: "Appointment retrieved.", invoices: invoices };
        res.json(rsObj);
    } catch (err) {
        res.status(400).json({ error: `Cannot get invoice, ${err.message}` })
    }
});

/* GET client list. */
router.get('/creditRecordList/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.creditRecordMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let creditRecordList = await CreditRecord.find({ "delFlag": false, client: reqe.params.id }).populate('staff')
        let rsObj = { ok: "Appointment retrieved.", creditRecordList: creditRecordList };
        res.json(rsObj);
    } catch (err) {
        res.status(400).json({ error: `Cannot get credit record list, ${err.message}` })
    }
});

module.exports = router;