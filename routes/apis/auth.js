var express = require('express');
var router = express.Router();
var auth = require('../../services/auth');
let logger = require('../../services/logger');

/* POST login api. */
router.post('/login', async (reqe, res, next) => {

    var rsJson = { error: "invalid username or password" };
    try {
        //getting username & password from request body
        var username = reqe.body.username.toLowerCase();
        var password = reqe.body.password;

        if (username != null && username.length > 0 && password != null && password.length > 0) {

            //* get and check user account */
            let userObj = await auth.getUserByLogin(username, password);

            if (userObj != null) {

                var ip = reqe.headers['x-forwarded-for'] || reqe.connection.remoteAddress;

                //* JWT Auth */
                var userData = {
                    id: userObj._id,
                    username: userObj.username,
                    displayName: userObj.displayName,
                    role: {
                        id: userObj.role._id,
                        name: userObj.role.name
                    },
                    IP: ip
                }
                //console.log(userData);

                // issue JWT to cookie
                let token = auth.issueJwtCookie(userData, res);

                //clear up data
                delete userObj.role.createdAt;
                delete userObj.role.updatedAt;
                delete userObj.role.delFlag;
                delete userObj.role.__v;

                var rsJson = {
                    "ok": `Staff has logined from ${ip}`,
                    "token": token,
                    "user": userObj
                };
                logger.audit("Auth", "Login", userObj._id, userObj._id, `${userObj.displayName} has logined from ${ip}`);
            }
        }
    } catch (err) { }

    if (rsJson.error) { res.status(400) }

    res.json(rsJson);
});

module.exports = router;