const express = require('express');
const router = express.Router();
const {
    register,
    login,
    checkEmail,
    googleAuth,
    googleUserInfoAuth,
    googleOAuthInit,
    googleOAuthCallback,
    getMe,
    logout,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public routes
router.get('/check-email',               checkEmail);
router.post('/register',                 register);
router.post('/login',                    login);
router.post('/google',                   googleAuth);           // Google OAuth (native — idToken)
router.post('/google/userinfo',          googleUserInfoAuth);   // Google OAuth (web — userInfo)
router.get('/google/init',               googleOAuthInit);      // Universal Google OAuth (all platforms)
router.get('/google/callback',           googleOAuthCallback);  // Google redirects here after login
router.post('/forgotpassword',           forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes
router.get('/logout',              protect, logout);
router.get('/me',                  protect, getMe);
router.put('/updatedetails',       protect, updateDetails);
router.put('/updatepassword',      protect, updatePassword);

module.exports = router;
