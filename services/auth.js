/**
 * Auth Service
 */
let createError = require('http-errors');
let crypto = require("crypto");
let jwt = require('jsonwebtoken');
let zlib = require('zlib');
let cookie = require('cookie');

let Staff = require('../models/auth/staff');
let StaffRole = require('../models/auth/staffrole');

//** hash data thought SHA256 */
function hash(data) {
    let hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}
exports.hash = hash;

//** encrypt data thought AES256 */
function encrypt(data) {
    try {
        let cipher = crypto.createCipher('aes-256-cbc', process.env.SecretKey);
        let encrypted = Buffer.concat([cipher.update(new Buffer(data, "utf8")), cipher.final()]);
        let zEncrypted  = zlib.deflateSync(encrypted);
        return zEncrypted.toString('base64');
    } catch (exception) {
        throw new Error(exception.message);
    }
}
exports.encrypt = encrypt;

//** decrypt data thought AES256 */
function decrypt(data) {
    try {
        data = zlib.inflateSync(Buffer.from(data, "base64"));
        let decipher = crypto.createDecipher("aes-256-cbc", process.env.SecretKey);
        let decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString("utf8");
    } catch (exception) {
        throw new Error(exception.message);
    }
}
exports.decrypt = decrypt;

//** get user from jwt token*/
function checkJwt(tokenStr){
    try{
        // //** Encrypted JWT Start */
        // let encryptedToken = jwt.verify(tokenStr, process.env.Secret).d;
        // let userObj = JSON.parse(decrypt(encryptedToken));
        // //** Encrypted JWT End */
        //** --- OR --- */
        //** Standard JWT Start */
        let userObj = jwt.verify(tokenStr, process.env.Secret);
        //** Standard JWT End */

        return userObj;
    }catch(err){ return null; }
};

//** get user from jwt cookie/header */
exports.checkJwt = (req, res, next) => {
    let token, userObj = null;
    
    if(req.cookies && req.cookies.token){ token = req.cookies.token}
    else if(req.get('token')){ token = req.get('token') }

    if(token){ userObj = checkJwt(token) }

    if(!token || !userObj){ next(createError(401)); return; }

    res.locals.user = userObj;
    next();
};

//** get user from jwt cookie string */
exports.checkJwtCookieStr = (str) => {
    let cookieObj = cookie.parse(str)
    return checkJwt(cookieObj.token);
};

//** set user jet to cookie */
exports.issueJwtCookie = (userObj, res) => {

    // //** Encrypted JWT Start */
    // //encrypte user data for jwt payload
    // var encryptedData = encrypt(JSON.stringify(userObj));
    // //gen jwt token and expirse in 8 hrs 
    // var token = jwt.sign({d:encryptedData}, process.env.Secret, { expiresIn: "8h" });
    // //** Encrypted JWT End */
    //** --- OR --- */
    //** Standard JWT Start */
    //gen jwt token and expirse in 8 hrs 
    var token = jwt.sign(userObj, process.env.Secret, { expiresIn: "8h" });
    //** Standard JWT End */

    // set cookie 
    //let cookieOptions = { httpOnly: true };
    //if(process.env.WebDomain){ cookieOptions.domain = process.env.WebDomain.replace('https://', '.').replace('http://', '.'); }
    //res.cookie('token', token, cookieOptions);

    return token;
};

//** get user obj by user name & password */
exports.getUserByLogin = async (username, password) => {
    try {
        let passCode = hash(password);
        let user = await Staff.findOne({"username": username, "password" : passCode, "delFlag" : false}).lean({ virtuals: true })
                                .select({"password": 0, "delFlag": 0, "createdAt": 0, "updatedAt": 0, "__v": 0})
                                .populate('role');
        return user;
    } catch (exception) {
        throw new Error(exception.message);
    }
};


//** get user obj by session id */
exports.getUserBySession = async (sessionId) => {
    try {


    } catch (exception) {
        throw new Error(exception.message);
    }
};