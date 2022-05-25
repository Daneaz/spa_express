
var express = require('express');
var router = express.Router();
let createError = require('http-errors');

let Service = require('../../models/service');
let Category = require('../../models/category');
let Staff = require('../../models/auth/staff');

let logger = require('../../services/logger');

/* GET service list. */
router.get('/services', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let services = await Service.find({ "delFlag": false }).lean()
            .populate("staff").populate("category")
        res.send(services);
    } catch (err) {
        res.status(400).json({ error: `Cannot get service list, ${err.message}` })
    }
});

/* GET service list. */
router.get('/services/:id', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let services = await Service.findOne({ "_id": reqe.params.id, "delFlag": false }).lean()
            .populate("staff").populate("category")
        res.send(services);
    } catch (err) {
        res.status(400).json({ error: `Cannot get service, ${err.message}` })
    }
});

/* Create service. */
router.post('/services', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.create) { next(createError(403)); return; }

        let rawNewService = reqe.body;

        let sService = await Service.findOne({ "name": rawNewService.name }).lean().select({ "name": 1 });
        if (sService != null) { throw new Error('Service name is already taken.') }

        //load main fields
        let newService = new Service(rawNewService);

        //save service 
        let doc = await newService.save();
        let rsObj = { ok: "Service has been created.", id: doc._id };
        logger.audit("Service Mgt", "Create", doc._id, staff.id, `A new service has been created by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot create service, ${err.message}` })
    }

});

/* PATCH update service. */
router.patch('/services/:id', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.edit) { next(createError(403)); return; }

        let rawService = reqe.body;

        //load data from db
        let newService = await Service.findOne({ "_id": reqe.params.id, "delFlag": false });

        newService.updatedBy = staff._id;
        newService.name = rawService.name || newService.name;
        newService.price = rawService.price || newService.price;
        newService.duration = rawService.duration || newService.duration;
        newService.staff = rawService.staff || newService.staff;
        newService.category = rawService.category || newService.category;
        //save service 
        let doc = await newService.save();
        let rsObj = { ok: "Service has been updated.", id: doc._id };
        logger.audit("Service Mgt", "Update", doc._id, staff.id, `Service has been updated by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot update service, ${err.message}` });
    }

});

/* DELETE disable service. */
router.delete('/services', async (reqe, res, next) => {
    try {

        let user = await Staff.findById(res.locals.user.id).populate('role');
        if (!user.role.serviceMgt.delete) { next(createError(403)); return; }

        //save service
        let deleteId = [];
        let delObj = { updatedBy: user._id, delFlag: true };
        reqe.body.forEach(async function (deleteObj) {
            let doc = await Service.findOneAndUpdate({ "_id": deleteObj._id, "delFlag": false }, delObj);
            deleteId.push(doc._id);
            logger.audit("Service Mgt", "Delete", doc._id, user.id, `Service has been deleted by ${user.displayName}`);
        });

        let rsObj = { ok: "Services are deleted.", id: deleteId };
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot delete service, ${err.message}` })
    }

});

/* Get Category. */
router.get('/category', async (reqe, res, next) => {
    try {
        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.list) { next(createError(403)); return; }

        //get raw data from data
        let category = await Category.aggregate([
            { $match: { delFlag: false } },
            {
                $project: {
                    "value": "$_id",
                    "label": "$name",
                }
            }
        ])
        res.send(category);
    } catch (err) {
        res.status(400).json({ error: `Cannot get category, ${err.message}` })
    }
});

/* Create Category. */
router.post('/category', async (reqe, res, next) => {
    try {

        let staff = await Staff.findById(res.locals.user.id).populate('role');
        if (!staff.role.serviceMgt.create) { next(createError(403)); return; }

        let rawNewCategory = reqe.body;

        let sCategory = await Category.findOne({ "name": rawNewCategory.name }).lean().select({ "name": 1 });
        if (sCategory != null) { throw new Error('Service name is already taken.') }

        //load main fields
        let newCategory = new Category(rawNewCategory);

        //save service 
        let doc = await newCategory.save();
        let rsObj = { ok: "Category has been created.", id: doc._id };
        logger.audit("Service Mgt", "Create", doc._id, staff.id, `A new category has been created by ${staff.displayName}`);
        res.json(rsObj);

    } catch (err) {
        res.status(400).json({ error: `Cannot create category, ${err.message}` })
    }
});
module.exports = router;