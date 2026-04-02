const express = require('express');
const router = express.Router();
const {
    register,
    login,
    googleAuth,
    googleUserInfoAuth,
    getMe,
    logout,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public routes
router.post('/register',                 register);
router.post('/login',                    login);
router.post('/google',                   googleAuth);           // Google OAuth (native — idToken)
router.post('/google/userinfo',          googleUserInfoAuth);   // Google OAuth (web — userInfo)
router.post('/forgotpassword',           forgotPassword);   // Send reset email
router.put('/resetpassword/:resettoken', resetPassword);    // Reset with token

// Protected routes
router.get('/logout',              protect, logout);
router.get('/me',                  protect, getMe);
router.put('/updatedetails',       protect, updateDetails);
router.put('/updatepassword',      protect, updatePassword);

module.exports = router;
