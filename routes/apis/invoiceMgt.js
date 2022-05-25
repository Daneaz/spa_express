
var express = require('express');
var router = express.Router();
let createError = require('http-errors');

let Client = require('../../models/auth/client');
let Staff = require('../../models/auth/staff');
let Invoice = require('../../models/invoice');
let Appointment = require('../../models/appointment');
let CreditRecord = require('../../models/creditRecord');
let logger = require('../../services/logger');

// SMS Config
const messagingApi = require("@cmdotcom/text-sdk");
const yourProductToken = "91888406-8B79-4800-9DB9-02390203CDA7";
const myMessageApi = new messagingApi.MessageApiClient(yourProductToken);

/* Buy Service using credit . */
router.post('/useCredit/:id', async (reqe, res, next) => {
    try {

        let data = reqe.body;

        Client.findOne({ "_id": reqe.params.id, "delFlag": false }).then(client => {
            if (client.credit < data.total) {
                res.json({ error: "Not enought credit, Please top up!" });
            } else {
                client.credit = client.credit - data.total;
                client.save();
                let servcies = [];
                for (let i = 0; i < data.bookings.length; i++) {
                    servcies.push(data.bookings[i].service.name)
                }
                let record = new CreditRecord({ client: client._id, services: servcies, amount: data.total })
                record.save();

                let mobile = client.mobile;
                let firstDigit = mobile.toString()[0];
                if (mobile.toString().length === 8 && (firstDigit === '8' || firstDigit === '9')) {
                    mobile = `+65${mobile}`;
                }
                let message = `You have purchase a service recently. Total: $${data.total}. Your remaining credit is ${client.credit}`
                const result = myMessageApi.sendTextMessage([mobile], "Sante", message);
                result.then((result) => {
                    console.log(result);
                }).catch((error) => {
                    console.log(error);
                });
                res.json({ ok: "Please process to the waiting area!" });
            }
        })
    } catch (err) {
        res.status(400).json({ error: `Cannot use credit, ${err.message}` })
    }

});

/* GET appointment infomation for invoice . */
router.get('/appointment/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.invoiceMgt.list) { next(createError(403)); return; }

        let appointment = await Appointment.findOne({ "_id": reqe.params.id, "delFlag": false })
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
        res.send(appointment);
    } catch (err) {
        res.status(400).json({
            error: `Cannot get appointment, ${err.message}`
        })
    }
});

/* GET appointment infomation for invoice . */
router.get('/appointmentToInvoice/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.invoiceMgt.list) { next(createError(403)); return; }

        let invoice = await Invoice.findOne({ appointment: reqe.params.id, delFlag: false })
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
        res.send(invoice);
    } catch (err) {
        res.status(400).json({
            error: `Cannot convert appointment to invoice, ${err.message}`
        })
    }
});


/* GET invoice list . */
router.get('/invoicelist', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.invoiceMgt.list) { next(createError(403)); return; }

        let invoices = await Invoice.find({ "delFlag": false })
            .populate("client")
        res.send(invoices);
    } catch (err) {
        res.status(400).json({
            error: `Cannot get invoice list, ${err.message}`
        })
    }
});

/* GET invoice infomation. */
router.get('/invoice/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.invoiceMgt.list) { next(createError(403)); return; }

        let invoice = await Invoice.findOne({ "_id": reqe.params.id, "delFlag": false })
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
        res.send(invoice);
    } catch (err) {
        res.status(400).json({
            error: `Cannot get invoice, ${err.message}`
        })
    }
});

/* POST Create invoice . */
router.post('/invoice', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.invoiceMgt.create) { next(createError(403)); return; }

        let newInvoice = new Invoice(reqe.body);
        newInvoice.createdBy = staff._id;
        newInvoice.updatedBy = staff._id;

        Appointment.findByIdAndUpdate(reqe.body.appointment, { checkout: true }, { new: true }).then(async result => {
            if (result.checkout) {
                let doc = await newInvoice.save();
                let invoice = await Invoice.findOne({ "_id": doc._id, "delFlag": false })
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
                let rsObj = { ok: "Invoice has been created.", invoice: invoice };
                logger.audit("Invoice Mgt", "Create", invoice._id, staff.id, `A new invoice has been created by ${staff.displayName}`);
                res.json(rsObj);
            }
        })

    } catch (err) {
        res.status(400).json({ error: `Cannot create invoice, ${err.message}` })
    }

});

/* DELETE disable invoice. */
router.delete('/invoice', async (reqe, res, next) => {
    try {

        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.invoiceMgt.delete) { next(createError(403)); return; }

        //save user 
        let deleteId = [];
        let delObj = { updatedBy: user._id, delFlag: true };
        reqe.body.forEach(async function (deleteObj) {
            let doc = await Invoice.findOneAndUpdate({ "_id": deleteObj._id, "delFlag": false }, delObj);
            deleteId.push(doc._id);
            logger.audit("Invoice Mgt", "Delete", doc._id, user.id, `Invoice has been deleted by ${user.displayName}`);
        });

        let rsObj = { ok: "Invoices are deleted.", id: deleteId };
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot delete Invoice, ${err.message}` })
    }

});

module.exports = router;