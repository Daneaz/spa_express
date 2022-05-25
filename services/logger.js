/**
 * logger Service
 */
let moment = require('moment');
var winston = require('winston');
 
var logger = winston.createLogger({
    level: 'silly',
    transports: [ 
        new winston.transports.Console({
            level: 'debug'
        }) 
    ]
});

if(process.env.LogFolder){
    require('winston-daily-rotate-file');
    var transportDailyRotateFile = new (winston.transports.DailyRotateFile)({
        filename: `${process.env.LogFolder}/%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        // maxSize: '20m',
        // maxFiles: '14d'
    });     
    transportDailyRotateFile.on('rotate', function(oldFilename, newFilename) { });

    logger.add(transportDailyRotateFile);
}

function error(err){
    var logErr = { level: 'error', timestamp: moment().format() }
    logErr = Object.assign(logErr, err);
    logger.log(logErr);
}
exports.error = error;

function info(info){
    var logInfo = { level: 'info', timestamp: moment().format() }
    logInfo = Object.assign(logInfo, info);
    logger.log(logInfo);
}
exports.info = info;

function audit(mod, action, refNum, user, msg){
    logger.log({
        level: 'silly', 
        module: mod,
        action: action,
        refNum: refNum,
        message: msg,
        user: user,
        timestamp: moment().format(),
    });
}
exports.audit = audit;