var createError = require('http-errors');
var express = require('express');
var path = require('path');
var morgan = require('morgan');
var mongoose = require('mongoose');
require('dotenv').config()
let auth = require('./services/auth');
let logger = require('./services/logger');

var indexRouter = require('./routes/index');
var apiAuthRouter = require('./routes/apis/auth');
var apiKioskRouter = require('./routes/apis/kioskMgt');
var apiUserMgtRouter = require('./routes/apis/staffMgt');
var apiClientMgtRouter = require('./routes/apis/clientMgt');
var apiServiceMgtRouter = require('./routes/apis/serviceMgt');
var apiAppointmentMgtRouter = require('./routes/apis/appointmentMgt');
var apiInvoiceMgtRouter = require('./routes/apis/invoiceMgt');
var apiCreditRecordMgtRouter = require('./routes/apis/creditRecordMgt');
var apiDashboardMgtRouter = require('./routes/apis/dashboardMgt');
var cors = require('cors');

var app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));
//setup express
app.disable('x-powered-by');
app.use(morgan('dev'));
app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({limit: '20mb', extended: false}));
app.use(express.static(path.join(__dirname, 'client/build')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next) {
    if (req.method === 'GET' && !req.originalUrl.toLowerCase().startsWith('/api')) {
        res.sendFile(path.join(__dirname + '/client/build/index.html'));
    } else {
        next()
    }
});

// setup mongoose
mongoose.connect(process.env.MongoDB_ConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//load app version
var pjson = require('./package.json');
app.locals.ver = pjson.version;

//routing
app.use('/api', indexRouter);
app.use('/api/kioskMgt', apiKioskRouter);
app.use(`/api/auth`, apiAuthRouter);


// check jwt if invalid
app.use(auth.checkJwt);
app.use('/api/staffMgt', apiUserMgtRouter);
app.use('/api/clientMgt', apiClientMgtRouter);
app.use('/api/serviceMgt', apiServiceMgtRouter);
app.use('/api/appointmentMgt', apiAppointmentMgtRouter);
app.use('/api/invoiceMgt', apiInvoiceMgtRouter);
app.use('/api/creditRecordMgt', apiCreditRecordMgtRouter);
app.use('/api/dashboardMgt', apiDashboardMgtRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {

    let errObj = {
        error: err.message,
        code: err.status || 500,
        details: err.stack,
    }
    //log user info if logined
    if (res.locals.user) {
        errObj.user = res.locals.user
    }

    //log error/info
    if (errObj.code === 500) {
        logger.error(errObj)
    }

    //send back error
    res.status(errObj.code);
    //only providing error in development
    if (req.app.get('env') !== 'development' || errObj.code !== 500) {
        delete errObj.details
    }
    delete errObj.user;
    res.json(errObj);
});

module.exports = app;
