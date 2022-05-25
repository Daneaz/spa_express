
var express = require('express');
var router = express.Router();
let createError = require('http-errors');
let Booking = require('../../models/booking');
let StaffRole = require('../../models/auth/staffrole');
let Staff = require('../../models/auth/staff');
let auth = require('../../services/auth');
let logger = require('../../services/logger');

/* Init the defalt values */
const init = async () => {

    try {
        let roleClient = new StaffRole({
            name: "Manager",
            staffMgt: {
                list: true,
                create: true,
                edit: true,
                delete: true
            },
            serviceMgt: {
                list: true,
                create: true,
                edit: true,
                delete: true
            },
            appointmentMgt: {
                list: true,
                create: true,
                edit: true,
                delete: true
            },
            invoiceMgt: {
                list: true,
                create: true,
                edit: true,
                delete: true
            },
            creditRecordMgt: {
                list: true,
                create: true,
                edit: true,
                delete: true
            },
        });
        await roleClient.save();

        let roleStaff = new StaffRole({
            name: "Staff",
            serviceMgt: {
                list: true,
                create: true,
                edit: true,
                delete: true
            }
        });
        await roleStaff.save();

    } catch (err) {
        console.log(`StaffRole table init error ${err.message}`);
    }

    try {
        let role = await StaffRole.findOne({ "name": "Manager", "delFlag": false });
        let checkStaff = await Staff.findOne({ "mobile": 97985397 }).lean().select({ "mobile": 1 });
        if (checkStaff != null) { throw new Error('mobile is already taken.') }
        let staff = new Staff(
            {
                username: "admin",
                password: "admin",
                mobile: 97985397,
                email: "admin@gmail.com",
                displayName: "Eugene",
                role: role._id
            });
        staff.password = auth.hash("admin");
        await staff.save();

    } catch (err) {
        console.log(`Staff table init error ${err.message}`);
    }
}
init();


/* GET all role all staff list. */
router.get('/staffs', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let rawStaffs = await Staff.find({ "delFlag": false }).lean()
            .populate("role")
            .select({
                "username": 1,
                "email": 1,
                "mobile": 1,
                "displayName": 1,
                "role": 1,
                "offDays": 1,
                "leaveDays": 1,
            });

        res.send(rawStaffs);
    } catch (err) {
        res.status(400).json({ error: `Cannot get staff list, ${err.message}` });
    }
});
/* GET working staff list. */
router.get('/workingStaff', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.list) { next(createError(403)); return; }

        let role = await StaffRole.findOne({ "delFlag": false, name: "Staff" });

        //get raw data from data
        let rawStaffs = await Staff.find({ "delFlag": false, role: role.id }).lean()
            .populate("role")
            .select({
                "username": 1,
                "email": 1,
                "mobile": 1,
                "displayName": 1,
                "role": 1,
                "offDays": 1,
                "leaveDays": 1,
            });

        res.send(rawStaffs);
    } catch (err) {
        res.status(400).json({ error: `Cannot get working staff list, ${err.message}` });
    }
});

/* GET total staff number. */
router.get('/totalstaffs', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.list) { next(createError(403)); return; }

        let role = await StaffRole.findOne({ "delFlag": false, name: "Staff" });
        let totalstaffs = await Staff.count({ "delFlag": false, role: role.id });

        res.send({ total: totalstaffs });
    } catch (err) {
        res.status(400).json({ error: `Cannot get total number of staff, ${err.message}` });
    }
});

/* GET staff details by id. */
router.get('/staffs/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.edit) { next(createError(403)); return; }

        //get raw data from data
        let rawStaff = await Staff.findOne({ "_id": reqe.params.id, "delFlag": false }).lean()
            .populate("role", "name")
            .select({
                "username": 1,
                "email": 1,
                "mobile": 1,
                "displayName": 1,
                "role.name": 1,
                "offDays": 1,
                "leaveDays": 1,
            });

        res.send(rawStaff);
    } catch (err) {
        res.status(400).json({ error: `Cannot get staff, ${err.message}` });
    }
});

/* GET check staff name exist. */
router.get('/loginexists', async (reqe, res, next) => {

    let rs = 'true';
    try {
        let staff = await Staff.findOne({ "username": reqe.query.login }).lean().select({ "username": 1 });
        if (staff == null) { rs = 'false' }
    } catch (err) { }

    res.send(rs);
});
/* GET check role name exist. */
router.get('/roleexists', async (reqe, res, next) => {

    let rs = 'true';
    try {
        let role = await StaffRole.findOne({ "name": reqe.query.name }).lean().select({ "name": 1 });
        if (role == null) { rs = 'false' }
    } catch (err) { }

    res.send(rs);
});

/* POST Create Staff. */
router.post('/staffs', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.create) { next(createError(403)); return; }

        let rawNewStaff = reqe.body;

        let sStaff = await Staff.findOne({ "username": rawNewStaff.username }).lean().select({ "username": 1 });
        if (sStaff != null) { throw new Error('login name is already taken.') }

        //load main fields
        let newStaff = new Staff(rawNewStaff);
        newStaff.createdBy = staff._id;
        newStaff.updatedBy = staff._id;

        //load fields by biz logic
        newStaff.password = auth.hash(rawNewStaff.password);

        //save user
        let doc = await newStaff.save();
        let rsObj = { ok: "Staff has been created.", id: doc._id };
        logger.audit("Staff Mgt", "Create", doc._id, staff.id, `A new staff has been created by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot create staff, ${err.message}` })
    }

});

/* PATCH update Staff. */
router.patch('/staffs/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.staffMgt.edit) { next(createError(403)); return; }

        let rawNewStaff = reqe.body;

        //load data from db
        let sStaff = await Staff.findOne({ "_id": reqe.params.id, "delFlag": false });

        let oldLeaves = sStaff.leaveDays;

        sStaff.updatedBy = staff._id;
        sStaff.username = rawNewStaff.username || sStaff.username;
        sStaff.email = rawNewStaff.email || sStaff.email;
        sStaff.displayName = rawNewStaff.displayName || sStaff.displayName;
        sStaff.mobile = rawNewStaff.mobile || sStaff.mobile;
        sStaff.offDays = rawNewStaff.offDays || sStaff.offDays;
        sStaff.leaveDays = rawNewStaff.leaveDays || sStaff.leaveDays;
        sStaff.role = rawNewStaff.role || sStaff.role;
        //load fields by biz logic
        if (rawNewStaff.Password) { sStaff.password = auth.hash(rawNewStaff.Password); }

        //save user
        let doc = await sStaff.save();
        if (oldLeaves.length != 0) {
            //TODO Delete all leaves
            let bookings = await Booking.find({ "delFlag": false, staff: doc._id, title: "On Leave" })

            for (let i = 0; i < bookings.length; i++) {
                let booking = await Booking.findOne({ "_id": bookings[i].id });
                booking.updatedBy = staff._id;
                booking.delFlag = true;
                // //save booking
                await booking.save();
            }
        }
        // new Date(start.getTime() + parseInt(serviceDuration) * 60000)
        if (rawNewStaff.leaveDays.length != 0) {
            // TODO Create bookings based on leaveDays
            let start, end;
            for (let i = 0; i < rawNewStaff.leaveDays.length; i++) {
                start = new Date(rawNewStaff.leaveDays[i])
                end = new Date(start.getTime() + parseInt(24) * 60000 * 60 - 1000)
                let booking = new Booking({
                    title: "On Leave",
                    start: start,
                    end: end,
                    staff: doc._id,
                })
                booking.createdBy = staff._id;
                booking.updatedBy = staff._id;
                await booking.save();
                logger.audit("Booking Mgt", "Create", `A new leave has been created by ${staff.displayName}`);
            }
        }
        let rsObj = { ok: "Staff has been updated.", id: doc._id };
        logger.audit("Staff Mgt", "Update", doc._id, staff.id, `Staff has been updated by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot update staff, ${err.message}` });
    }

});

/* DELETE disable Staff. */
router.delete('/staffs', async (reqe, res, next) => {
    try {

        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.staffMgt.delete) { next(createError(403)); return; }

        //save user
        let deleteId = [];
        let delObj = { updatedBy: user._id, delFlag: true };
        reqe.body.forEach(async function (deleteObj) {
            let doc = await Staff.findOneAndUpdate({ "_id": deleteObj._id, "delFlag": false }, delObj);
            deleteId.push(doc._id);
            logger.audit("Staff Mgt", "Delete", doc._id, user.id, `Staff has been deleted by ${user.displayName}`);
        });

        let rsObj = { ok: "Staffs are deleted.", id: deleteId };
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot delete Staff, ${err.message}` })
    }

});

/* GET role list. */
router.get('/roles', async (reqe, res, next) => {
    try {
        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.staffMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let rawRoles = await StaffRole.aggregate([
            { $match: { delFlag: false } },
            {
                $project: {
                    "value": "$_id",
                    "label": "$name",
                }
            }
        ])
        res.send(rawRoles);
    } catch (err) {
        res.status(400).json({ error: `Cannot get role list, ${err.message}` })
    }
});



/* GET role details by id. */
router.get('/roles/:id', async (reqe, res, next) => {
    try {
        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.staffMgt.edit) { next(createError(403)); return; }

        //get raw data from data
        let sUserRole = await StaffRole.findOne({ "_id": reqe.params.id, "delFlag": false }).lean()
            .select({ "delFlag": 0, "__v": 0 });

        res.send(sUserRole);
    } catch (err) {
        res.status(400).json({ error: `Cannot get role, ${err.message}` })
    }
});

/* POST Create Role. */
router.post('/roles', async (reqe, res, next) => {
    try {

        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.staffMgt.create) { next(createError(403)); return; }

        let rawNewRole = reqe.body;

        //check role name exist
        let sRole = await StaffRole.findOne({ "name": rawNewRole.name }).lean().select({ "name": 1 });
        if (sRole != null) { throw new Error('role name is already taken.') }

        //load main fields
        let newRole = new StaffRole(rawNewRole);
        newRole.createdBy = user._id;
        newRole.updatedBy = user._id;

        //save role
        let doc = await newRole.save();
        let rsObj = { ok: "Staff role has been created.", id: doc._id };
        logger.audit("Staff Mgt", "Create", doc._id, user.id, `A new user role has been created by ${user.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot create staff role, ${err.message}` })
    }

});

/* PATCH Update Role. */
router.patch('/roles/:id', async (reqe, res, next) => {
    try {

        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.staffMgt.edit) { next(createError(403)); return; }

        let rawNewRole = reqe.body;
        //load main fields
        let sRole = await StaffRole.findOne({ "_id": reqe.params.id, "delFlag": false });
        sRole.updatedBy = user._id;

        sRole.name = rawNewRole.name || sRole.name;
        sRole.staffMgt = rawNewRole.staffMgt || sRole.staffMgt;
        sRole.MasterData = rawNewRole.MasterData || sRole.MasterData;
        sRole.Room = rawNewRole.Room || sRole.Room;
        sRole.Blackout = rawNewRole.Blackout || sRole.Blackout;
        sRole.Meeting = rawNewRole.Meeting || sRole.Meeting;
        sRole.WorkReuqest = rawNewRole.WorkReuqest || sRole.WorkReuqest;

        //save role
        let doc = await sRole.save();
        let rsObj = { ok: "Staff Role has been Updated.", id: doc._id };
        logger.audit("Staff Mgt", "Update", doc._id, user.id, `Staff Role has been updated by ${user.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot update Staff Role\r\n ${err.message}` })
    }

});

/* DELETE  Role. */
router.delete('/roles/:id', async (reqe, res, next) => {
    try {

        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.staffMgt.delete) { next(createError(403)); return; }

        //save role
        let delObj = { updatedBy: user._id, delFlag: true };
        let doc = await StaffRole.findOneAndUpdate({ "_id": reqe.params.id, "delFlag": false }, delObj);
        let rsObj = { ok: "Staff Role has been deleted.", id: doc._id };
        logger.audit("Staff Mgt", "Deleted", doc._id, user.id, `Staff Role has been deleted by ${user.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.json({ error: `Cannot delete Staff Role\r\n ${err.message}` });
    }

});

module.exports = router;
