const express= require('express');
const router = express.Router();
const {upload} = require('../utils/image-upload');
const { 
    registerUser,
    loginUser, 
    logout, 
    forgotPassword, 
    resetPassword,
    getUserProfile,
    updatePassword,
    updateProfile,
    allUsers,
    getUserDetails,
    updateUser,
    deleteUser
} = require('../controllers/authController');


const { isAuthenticatedUser, authorizeRoles} = require('../middlewares/auth')

router.route('/register').post(upload.single('file'), registerUser);
router.route('/login').post(loginUser);

router.route('/password/forgot').post(forgotPassword)
router.route('/password/reset/:token').put(resetPassword)
// router.route('/password/reset/:id').put(resetPassword)

router.route('/logout').get(logout);

router.route('/me').get(isAuthenticatedUser, getUserProfile)
router.route('/password/update').put(isAuthenticatedUser, updatePassword)
router.route('/me/update').put(isAuthenticatedUser, upload.single('file'),updateProfile)

router.route('/admin/users').get(isAuthenticatedUser, authorizeRoles('admin'), allUsers)
router.route('/admin/user/:id')
            .get(isAuthenticatedUser, authorizeRoles('admin'), getUserDetails)
            .put(isAuthenticatedUser, authorizeRoles('admin'), updateUser)
            .delete(isAuthenticatedUser, authorizeRoles('admin'), deleteUser)

module.exports= router;