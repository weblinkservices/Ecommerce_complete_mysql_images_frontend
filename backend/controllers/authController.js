const util = require('util');
const connection = require('../config/connection');
var validator = require("email-validator");
const getResetPasswordToken = require('../utils/getResetPasswordToken');

const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto')
const fs = require("fs");

//Register a user => /api/v1/register
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
    const filePath = (req.file.path).replace(/\\/g, "\\\\");
    const { name, email, password } = req.body;
    if (!password || password.length < 6) {
        return next(new ErrorHandler("Your password must be longer than 6 characters", 404));
    }
    if (!name || name.length > 30) {
        return next(new ErrorHandler("Please enter valid name (cannot exceed 30 characters)", 404));
    }
    if (!email || !validator.validate(email)) {
        return next(new ErrorHandler("Please enter valid email address", 404));
    }
    var hash = crypto.createHash('md5').update(password).digest('hex');

    const user = {
        name,
        email,
        hash,
        mobile: Math.floor(Math.random() * (10 - 2 + 1)) + 2 * 8,
        imageName: req.file.filename,
        path: filePath
    }

    const sql = `insert into users(id, name, email, mobile, password, role, date, imageName, path,resetPasswordToken,
    resetPasswordExpire) values(NULL,'${user.name}', '${user.email}', ${user.mobile}, '${user.hash}', 'user', 
    Null,'${user.imageName}', '${user.path}', NULL,NULL);`;
    const query = util.promisify(connection.query).bind(connection);
    let userID;
    // console.dir(req.headers['content-type']);

    let result = async function () {
        try {
            const rows = await query(sql);
            userID = rows.insertId;
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        }
    }
    result()
        .then(value => {
            sendToken(user, 200, res, userID)
        }).catch(error => {
            console.log("User registeration fail  :-", error.message)
        });
})

//Login User => /api/v1/login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;
    var hash = crypto.createHash('md5').update(password).digest('hex');
    if (password.length < 6) {
        return next(new ErrorHandler("Invalid password", 404));
    }
    if (!validator.validate(email)) {
        return next(new ErrorHandler("Invalid email", 404));
    }

    //Check if null email  and password is entered by user
    if (!email || !password) {
        return next(new ErrorHandler('Please enter email & password', 400))
    }

    const user = {
        email,
        hash
    }
    //Finding user in databases
    const sql = `select * from users where email='${email}' and password='${hash}';`;
    const query = util.promisify(connection.query).bind(connection);
    let userID;
    let result = async function () {
        try {
            const rows = await query(sql);
            if (rows.length <= 0) {
                return next(new ErrorHandler('Invalid Email or Password', 401));
            }
            if (!rows) {
                return next(new ErrorHandler('Invalid Email or Password', 401));
            }
            userID = rows[0].id;
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler("Please enter correct email & password", err.message, 404));
        }
    }
    result()
        .then(value => {
            sendToken(user, 200, res, userID)
        }).catch(error => {
            console.log("Please enter correct email & password", error.message)
        });
})

//Forget Password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const user = { email: req.body.email }
    const { resetToken, resetPasswordToken, resetPasswordExpire } = getResetPasswordToken.getResetPasswordToken();
    if (!validator.validate(user.email)) {
        return next(new ErrorHandler("Invalid email", 404));
    }

    const sql = `select email from users where email='${user.email}';`;
    const query = util.promisify(connection.query).bind(connection);
    const sql1 = ` update users set resetPasswordToken='${resetPasswordToken}',
                resetPasswordExpire='${resetPasswordExpire}' where email='${user.email}';`;

    let result = async function () {
        try {
            const rows = await query(sql);
            if (rows.length <= 0) {
                return next(new ErrorHandler('User not found with this email', 404));
            } else {
                const rows1 = await query(sql1);
                const resetUrl = `${req.protocol}://${req.get('host')}/password/reset/${resetToken}`;
                const message = `Your password reset token is as follow: \n\n${resetUrl}\n\nIf you have not requested this email, then ignore it.`
                try {
                    await sendEmail({
                        email: user.email,
                        subject: 'Homeland Grocery Password Recovery',
                        message
                    })
                } catch (error) {
                    return next(new ErrorHandler(error.message, 500))
                }
            }
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                message: `Email send to:${user.email}`
            })
        }).catch(error => {
            console.log(error.message)
        });
})

//Reset Password => /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
    //Hash URL token
    // const resetPasswordToken2 = crypto.createHash('sha256').update(req.params.token).digest('hex');
    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler('Password does not match', 400))
    }
    var hash = crypto.createHash('md5').update(req.body.password).digest('hex');
    let token = req.params.token;
    var user;

    const sql = `select password,resetPasswordToken,resetPasswordExpire from users where 
    resetPasswordToken='${token}';`;
    const query = util.promisify(connection.query).bind(connection);
    const sql1 = `update users set password='${hash}', resetPasswordToken=NULL, resetPasswordExpire=NULL
    where resetPasswordToken='${token}';`;
    let userID;
    let result = async function () {
        try {
            const rows = await query(sql);
            if (!rows.length) {
                return next(new ErrorHandler('Password reset token is invalid or has been expired ', 400))
            } else {
                user = {
                    resetPasswordToken: rows[0].resetPasswordToken,
                    resetPasswordExpire: rows[0].resetPasswordExpire
                }
                const rows1 = await query(sql1);
                if (!rows.length) {
                    return next(new ErrorHandler('Password does not reset', 401));
                }
                userID = rows1[0].id;
            }

        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        }
    }
    result()
        .then(value => {
            sendToken(user, 200, res, userID)
        }).catch(error => {
            console.log(error.message)
        });
})

//Get currently logged in user details => /apiv1/me
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
    const sql = `select * from users where id=${req.user.id};`;
    const query = util.promisify(connection.query).bind(connection);
    var user;
    let result = async function () {
        try {
            const rows = await query(sql);
            user = rows[0];
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                user
            })
        }).catch(error => {
            console.log(error.message)
        });
})

//Update / change password  => /api/v1/password/update
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
    var oldPassword = req.body.oldPassword;
    var password = req.body.password;

    if (!oldPassword || oldPassword.length < 6 || !password || password.length < 6) {
        return next(new ErrorHandler("Old password is incorrect", 404));
    }

    var hash = crypto.createHash('md5').update(oldPassword).digest('hex');
    var newHash = crypto.createHash('md5').update(password).digest('hex');

    const sql2 = `select * from users where id=${req.user.id}`;
    const sql = `update users set password='${newHash}' where id=${req.user.id} and password='${hash}';`;
    const query = util.promisify(connection.query).bind(connection);
    var user;
    let userID;
    let result = async function () {
        try {
            const rows = await query(sql);
            const rows2 = await query(sql2);
            if (!rows.affectedRows) {
                return next(new ErrorHandler("Old password is incorrect", 404));
            }
            user = rows2;
            userID = rows2[0].id
            console.log("first", user, userID);

        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        }
    }
    result()
        .then(value => {
            sendToken(user, 200, res, userID)
        }).catch(error => {
            console.log(error.message)
        });
})

// Update user profile   =>   /api/v1/me/update
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const filePath = (req.file.path).replace(/\\/g, "\\\\");
    // var hash = crypto.createHash('md5').update(req.body.password).digest('hex');
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        // mobile: req.body.mobile,
        // password: hash,
        imageName: req.file.filename,
        path: filePath
    }

    if (!newUserData) {
        return next(new ErrorHandler("Please enter name & email", 404));
    }
    if (!validator.validate(newUserData.email)) {
        return next(new ErrorHandler("Invalid email", 404));
    }

    const deleteAavatar = `select imageName from users where id = ${req.user.id};`;
    const sql = `update users set name='${newUserData.name}', email='${newUserData.email}', imageName='${newUserData.imageName}', path='${newUserData.path}' where id=${req.user.id};`;

    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            // const rows = await query(sql, [req.body]);
            const rows1 = await query(deleteAavatar);
            const rows = await query(sql);
            console.log("rows1", rows1[0].imageName);

            //delete image 
            if (req.file) {
                try {
                    fs.unlinkSync('backend/uploads/' + rows1[0].imageName);
                    //file removed
                } catch (err) {
                    console.error(err)
                }
            }
            if (rows.length === 0) {
                return next(new ErrorHandler("User profile is not updated", 404));
            }
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true
            })
            res.setHeader("Content-Type", "text/html");
        }).catch(error => {
            console.log(error.message)
        });
})

//Logout user => /api/v1/logout
exports.logout = catchAsyncErrors(async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: 'Logged out'
    })
})

//Admin Routes
//Get all users => /api/v1/admin/users
exports.allUsers = catchAsyncErrors(async (req, res, next) => {
    let users;
    const sql = `select * from users`;
    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            users = rows;
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(err.message, 404));
        } finally {
            return users;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                users
            });
        }).catch(error => {
            console.log(error.message)
        });
})

// Get user details   =>   /api/v1/admin/user/:id
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
    let user;
    const sql = `select * from users where id=${req.params.id}`;
    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            if (rows.length <= 0) {
                res.status(404).send({ status: 1, message: `User does not found with id: ${req.params.id}` });
            }
            user = rows[0];
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler(`User does not found with id: ${req.params.id}`))
        } finally {
            return user;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                user
            });
        }).catch(error => {
            console.log(error.message)
        });
})

// Update user profile   =>   /api/v1/admin/user/:id
exports.updateUser = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
    }

    const sql = `update users set name='${newUserData.name}', email='${newUserData.email}', role='${newUserData.role}' where id=${req.params.id};`;
    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            if (!rows.affectedRows) {
                res.status(404).send({ status: 1, message: `User does not found with id: ${req.params.id}` });
            }

        } catch (err) {
            console.log(err);
            res.status(404).send({ status: 1, message: `User does not found with id: ${req.params.id}` });
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true
            })
        }).catch(error => {
            console.log(error.message)
        });
})

//Delete user => /api/v1/admin/user/:id
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
    let users;
    let image_id;
    const sql1 = `select imageName from users where id = ${req.params.id}`;
    const sql = `delete from users where id=${req.params.id}; ALTER TABLE users AUTO_INCREMENT=1; `;
    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows1 = await query(sql1);
            const rows = await query(sql);
            try {
                fs.unlinkSync('backend/uploads/' + rows1[0].imageName);
            } catch (err) {
                console.error(err)
            }
            users = rows;
            image_id = rows[0].public_id;
            if (rows[0].affectedRows === 0) {
                res.status(404).send({ status: 1, message: `User does not found with id: ${req.params.id}` });
            }
        } catch (err) {
            console.log(err);
            res.status(404).send({ status: 1, message: `User does not found with id: ${req.params.id}` });
        } finally {
            return users;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                users
            });
        }).catch(error => {
            console.log(error.message)
        });
})
