var express = require('express');
var router = express.Router();
let createError = require('http-errors');

let Staff = require('../../models/auth/staff');
let Client = require('../../models/auth/client');
let Service = require('../../models/service');
let Booking = require('../../models/booking');
let Appointment = require('../../models/appointment');
let logger = require('../../services/logger');

/* GET booking list. */
router.get('/appointment/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.list) { next(createError(403)); return; }

        // return and rename the data as calender needs
        let appointment = await Appointment.findOne({ "_id": reqe.params.id, "delFlag": false })
            .populate({
                path: "bookings",
                populate: {
                    path: 'service',
                }
            });
        res.send(appointment);
    } catch (err) {
        res.status(400).json({ error: `Cannot get appointment, ${err.message}` })
    }
});

/* POST Create appointment. */
router.post('/appointment', async (reqe, res, next) => {
    try {
        // check rights 
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.create) { next(createError(403)); return; }
        //Create an empty appointment to get the id.

        (new Appointment({ client: reqe.body[0].client })).save().then(async (appointment) => {
            let bookings = reqe.body
            for (let i = 0; i < bookings.length; i++) {
                let client = await Client.findById(bookings[i].client)
                let service = await Service.findById(bookings[i].service)
                bookings[i].appointment = appointment._id
                bookings[i].title = `${service.name} ${client.mobile} (${client.displayName})`
            }

            // creating all bookings
            Booking.insertMany(bookings).then(bookings => {
                let bookingids = bookings.map(booking => {
                    return booking._id
                })
                appointment.bookings = bookingids

                appointment.save()
                let rsObj = { ok: "Appointment has been created.", bookings: bookings, appointmentId: appointment._id }
                logger.audit("Appointment Mgt", "Create", bookings._id, staff.id, `A new appointment has been created by ${staff.displayName}`)
                res.json(rsObj)
            }).catch(err => {
                res.status(400).json({ error: `Cannot create appointment, ${err.message}` })
            })
        }).catch(err => {
            res.status(400).json({ error: `Cannot create appointment, ${err.message}` })
        })
    } catch (err) {
        res.status(400).json({ error: `Cannot create appointment, ${err.message}` })
    }
});

/* PATCH Update appointment. */
router.patch('/appointment/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.edit) { next(createError(403)); return; }

        Appointment.findOne({ "_id": reqe.params.id, "delFlag": false }).then(appointment => {
            Booking.updateMany({ appointment: appointment._id }, { delFlag: true }).then(() => {
                let newbookings = reqe.body.map(async (booking) => {
                    if (booking._id.length > 20) {
                        let client = await Client.findById(booking.client)
                        let service = await Service.findById(booking.service)
                        return new Promise((resolve, reject) => {
                            Booking.findByIdAndUpdate(
                                { _id: booking._id },
                                {
                                    $set:
                                    {
                                        title: `${service.name} ${client.displayName}`,
                                        start: booking.start,
                                        end: booking.end,
                                        staff: booking.staff,
                                        client: booking.client,
                                        service: booking.service,
                                        delFlag: false,
                                    }
                                },
                                { new: true }
                            ).then(booking => {
                                return resolve(booking)
                            }).catch(err => {
                                return reject(err)
                            })
                        })
                    } else {
                        let client = await Client.findById(booking.client)
                        let service = await Service.findById(booking.service)
                        delete booking._id
                        booking.appointment = appointment._id
                        booking.title = `${service.name} ${client.displayName}`
                        return new Promise((resolve, reject) => {
                            new Booking(booking).save().then(doc => {
                                appointment.bookings = [...appointment.bookings, doc._id]
                                return resolve(doc)
                            }).catch(err => {
                                return reject(err)
                            })
                        })
                    }
                })
                Promise.all(newbookings).then(bookings => {
                    let bookingIds = bookings.map(booking => {
                        return booking._id
                    })
                    appointment.bookings = bookingIds
                    appointment.save()
                    let rsObj = { ok: "Appointment has been created.", bookings: bookings, appointmentId: appointment._id }
                    logger.audit("Appointment Mgt", "Create", bookings._id, staff.id, `A new appointment has been created by ${staff.displayName}`)
                    res.json(rsObj)
                })
            })
        }).catch(err => {
            res.status(400).json({ error: `Cannot update appointment, ${err.message}` })
        })
    } catch (err) {
        res.status(400).json({ error: `Cannot update appointment, ${err.message}` })
    }
});

/* DELETE disable booking. */
router.delete('/appointment/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.delete) { next(createError(403)); return; }

        //load data from db
        let appointment = await Appointment.findOne({ "_id": reqe.params.id });
        appointment.updatedBy = staff._id;
        appointment.delFlag = true;
        Booking.updateMany({ appointment: appointment._id }, { delFlag: true }).then(result => {
            if (result.ok) {
                appointment.save().then(doc => {
                    let rsObj = {
                        ok: "Appointment has been deleted.",
                        id: doc._id
                    };
                    logger.audit("Appointment Mgt", "Delete", doc._id, staff.id, `Appointment has been deleted by ${staff.DisplayName}`);
                    res.json(rsObj);
                })
            }
        })
    } catch (err) {
        res.status(400).json({ error: `Cannot delete appointment, ${err.message}` })
    }

});

/* GET booking list. */
router.get('/bookings', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.list) { next(createError(403)); return; }
        // return and rename the data for big calendar output
        let bookings = await Booking.aggregate([
            { $match: { delFlag: false } },
            {
                $project: {
                    "id": "$_id",
                    "resourceId": "$staff",
                    "resource": "$client",
                    "appointment": 1,
                    "title": 1,
                    "client": 1,
                    "service": 1,
                    "start": 1,
                    "end": 1,
                }
            }
        ])
        res.send(bookings);
    } catch (err) {
        res.status(400).json({ error: `Cannot get booking list, ${err.message}` })
    }
});

/* GET available staff list. */
router.post('/availablestaff', async (reqe, res, next) => {
    try {
        //get raw data from data
        let service = reqe.body;
        let startTime = new Date(service.start)
        let endTime = new Date(service.end)
        let staffs = service.staff;
        let staffList = []
        let todayDate = new Date(startTime.toDateString());
        for (let i = 0; i < staffs.length; i++) {
            let bookings = await Booking.find({ staff: staffs[i]._id, start: { $gte: todayDate }, delFlag: false });
            if (bookings.length <= 0) {
                staffList.push(staffs[i])
                continue;
            }
            let conflit = false;
            for (let j = 0; j < bookings.length; j++) {
                if ((bookings[j].end > startTime && startTime > bookings[j].start) || (bookings[j].end > endTime && endTime > bookings[j].start)) {
                    conflit = true
                }
            }
            if (!conflit) {
                staffList.push(staffs[i])
            }
        }
        res.send(staffList);
    } catch (err) {
        res.status(400).json({ error: `Cannot get availablestaff list, ${err.message}` })
    }
});

/* Get Category. */
router.get('/availableservice/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let availableservice = await Service.find({ delFlag: false, category: reqe.params.id }).populate('staff')
        res.send(availableservice);
    } catch (err) {
        res.status(400).json({ error: `Cannot get available staff, ${err.message}` })
    }
});

/* POST Create booking. */
router.post('/bookings', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.create) { next(createError(403)); return; }

        //load main fields
        let booking = new Booking(reqe.body);
        booking.createdBy = staff._id;
        booking.updatedBy = staff._id;

        //save client 
        let doc = await booking.save();
        let rsObj = { ok: "Booking has been created.", booking: doc };
        logger.audit("Booking Mgt", "Create", doc._id, staff.id, `A new booking has been created by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot create booking, ${err.message}` })
    }
});

/* PATCH update booking. */
router.patch('/bookings/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.edit) { next(createError(403)); return; }

        let rawBooking = reqe.body;

        //load booking from db
        let booking = await Booking.findOne({ "_id": reqe.params.id, "delFlag": false });

        booking.updatedBy = staff._id;
        booking.title = rawBooking.title || booking.title;
        booking.start = rawBooking.start || booking.start;
        booking.end = rawBooking.end || booking.end;
        booking.staff = rawBooking.staff || booking.staff;
        booking.client = rawBooking.client || booking.client;
        booking.service = rawBooking.service || booking.service;

        //save booking 
        let doc = await booking.save();
        let rsObj = { ok: "Booking has been updated.", booking: doc };
        logger.audit("Booking Mgt", "Update", doc._id, staff.id, `Booking has been updated by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot update booking, ${err.message}` });
    }

});

/* DELETE disable booking. */
router.delete('/bookings/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.appointmentMgt.delete) { next(createError(403)); return; }

        //load data from db
        let booking = await Booking.findOne({ "_id": reqe.params.id });
        booking.updatedBy = staff._id;
        booking.delFlag = true;
        // //save user 
        let doc = await booking.save();
        let rsObj = {
            ok: "User has been deleted.",
            id: doc._id
        };
        logger.audit("Booking Mgt", "Delete", doc._id, staff.id, `Booking has been deleted by ${staff.DisplayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot delete booking, ${err.message}` })
    }

});

module.exports = router;