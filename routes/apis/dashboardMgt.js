var express = require('express');
var router = express.Router();
let createError = require('http-errors');

let Appointment = require('../../models/appointment');

/* PATCH update add credit. */
router.get('/dashboard', async (reqe, res, next) => {
    try {
        let date = new Date();
        date.setDate(1);
        date.setHours(0);
        date.setMinutes(0);
        let bookingsByStaff = await Appointment.aggregate([
            {
                $match: {
                    delFlag: false,
                    createdAt: { $gte: date }
                }
            },
            {
                $lookup:
                {
                    from: "bookings",
                    localField: "bookings",
                    foreignField: "_id",
                    as: "bookings"
                }
            },
            {
                $group:
                {
                    _id: { $arrayElemAt: ["$bookings.staff", 0] },
                    Bookings: { $sum: 1 },
                }
            },
            {
                $lookup:
                {
                    from: "staffs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "staffName"
                }
            },
            {
                $project:
                {
                    staffName: "$staffName.displayName",
                    Bookings: 1
                }
            }
        ])
        date.setMonth(0);
        let missedAppointment = await Appointment.aggregate([
            {
                $match:
                {
                    delFlag: false,
                    checkout: false,
                    createdAt: { $gte: date }
                }
            },
            {
                $group:
                {
                    _id: { $month: "$createdAt" },
                    Missed: { $sum: 1 },
                }
            },
            {
                $sort:
                {
                    _id: 1
                }
            }
        ])

        let completedAppointment = await Appointment.aggregate([
            {
                $match:
                {
                    delFlag: false,
                    checkout: true,
                    createdAt: { $gte: date }
                }
            },
            {
                $group:
                {
                    _id: { $month: "$createdAt" },
                    Completed: { $sum: 1 },
                }
            },
            {
                $sort:
                {
                    _id: 1
                }
            }
        ])

        for (let i = 0; i < bookingsByStaff.length; i++) {
            bookingsByStaff[i].staff = bookingsByStaff[i].staffName[0]
        }
        let appointments = mergeAppoinmentObj(completedAppointment, missedAppointment);
        appointments.map(appointment => {
            appointment.Total = appointment.Missed + appointment.Completed
        })
        let rsObj = { ok: "Success.", bookingsByStaff: bookingsByStaff, appointments: appointments };
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot get dashboard, ${err.message}` });
    }

});

function mergeAppoinmentObj(arr1, arr2) {
    return arr1.map((item, i) => {
        if (item.id === arr2[i].id) {
            //merging two objects
            return Object.assign({}, item, arr2[i])
        }
    })
}

module.exports = router;
