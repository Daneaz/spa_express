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
                    createdAt: {$gte: date}
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
                        _id: {$arrayElemAt: ["$bookings.staff", 0]},
                        Bookings: {$sum: 1},
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
        let today = new Date();
        let missedAppointment = await Appointment.aggregate([
            {
                $match:
                    {
                        delFlag: false,
                        checkout: false,
                        bookingDate: {$gte: date, $lte: today}
                    }
            },
            {
                $group:
                    {
                        _id: {$dateToString: {format: "%Y-%m-%d", date: "$bookingDate"}},
                        Missed: {$sum: 1},
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
                        bookingDate: {$gte: date, $lte: today}
                    }
            },
            {
                $group:
                    {
                        _id: {$dateToString: {format: "%Y-%m-%d", date: "$bookingDate"}},
                        Completed: {$sum: 1},
                    }
            },
            {
                $sort:
                    {
                        _id: 1
                    }
            }
        ])

        let totalAppointment = await Appointment.aggregate([
            {
                $match:
                    {
                        delFlag: false,
                        bookingDate: {$gte: date}
                    }
            },
            {
                $group:
                    {
                        _id: {$dateToString: {format: "%Y-%m-%d", date: "$bookingDate"}},
                        Total: {$sum: 1},
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

        let appointments = mergeAppoinmentObj(totalAppointment, missedAppointment, completedAppointment);

        let rsObj = {ok: "Success.", bookingsByStaff: bookingsByStaff, appointments: appointments};
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({error: `Cannot get dashboard, ${err.message}`});
    }

});

function mergeAppoinmentObj(totalAppointment, missedAppointment, completedAppointment) {

    return totalAppointment.map(total => {
        let miss = missedAppointment.find(miss => miss._id === total._id);
        if (miss) {
            total.Missed = miss.Missed;
        }
        let complete = completedAppointment.find(complete => complete._id === total._id)
        if (complete) {
            total.Completed = complete.Completed
        }
        return total;
    })
}

module.exports = router;
