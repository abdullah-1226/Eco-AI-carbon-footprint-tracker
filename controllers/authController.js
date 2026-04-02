const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ────────────────────────────────────────────────────────────────

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id:     user._id,
            name:   user.name,
            email:  user.email,
            role:   user.role,
            avatar: user.avatar,
            provider: user.provider
        }
    });
};

const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html
    });
};

// ─── @route  POST /api/auth/register ────────────────────────────────────────
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, error: 'Password is required' });
        }

        const user = await User.create({
            name,
            email,
            password,
            provider: 'local',
            role: role || 'user'
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

// ─── @route  POST /api/auth/login ────────────────────────────────────────────
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        if (user.provider === 'google') {
            return res.status(401).json({ success: false, error: 'This account uses Google Sign-In. Please sign in with Google.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// ─── @route  POST /api/auth/google ───────────────────────────────────────────
// Receives the Google ID token from the mobile app, verifies it, then
// finds-or-creates the user and returns a JWT.
exports.googleAuth = async (req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, error: 'Google ID token is required' });
        }

        // Verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Find or create user
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            // Link Google ID if they registered locally with same email
            if (!user.googleId) {
                user.googleId = googleId;
                user.avatar   = user.avatar || picture;
                user.provider = 'google';
                await user.save({ validateBeforeSave: false });
            }
        } else {
            user = await User.create({
                name,
                email,
                googleId,
                avatar:   picture,
                provider: 'google',
                role:     'user'
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// ─── @route  POST /api/auth/google/userinfo ──────────────────────────────────
// Web path: frontend already fetched userInfo via accessToken from Google.
// We trust it since it came directly from Google's /userinfo endpoint.
exports.googleUserInfoAuth = async (req, res, next) => {
    try {
        const { userInfo } = req.body;

        if (!userInfo?.sub || !userInfo?.email) {
            return res.status(400).json({ success: false, error: 'Invalid Google user info' });
        }

        const { sub: googleId, email, name, picture, email_verified } = userInfo;

        if (!email_verified) {
            return res.status(401).json({ success: false, error: 'Google email is not verified' });
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            if (!user.googleId) {
                user.googleId = googleId;
                user.avatar   = user.avatar || picture;
                user.provider = 'google';
                await user.save({ validateBeforeSave: false });
            }
        } else {
            user = await User.create({
                name,
                email,
                googleId,
                avatar:   picture,
                provider: 'google',
                role:     'user'
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// ─── @route  GET /api/auth/me ────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// ─── @route  GET /api/auth/logout ────────────────────────────────────────────
exports.logout = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Successfully logged out' });
    } catch (error) {
        next(error);
    }
};

// ─── @route  PUT /api/auth/updatedetails ─────────────────────────────────────
exports.updateDetails = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name: req.body.name, email: req.body.email },
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// ─── @route  PUT /api/auth/updatepassword ────────────────────────────────────
exports.updatePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.matchPassword(req.body.currentPassword))) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        user.password = req.body.newPassword;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// ─── @route  POST /api/auth/forgotpassword ───────────────────────────────────
// JWT-based reset — no email required.
// Signs a short-lived JWT (10 min) using JWT_SECRET + user's current hashed
// password as the secret, so the token auto-invalidates after a password change.
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email }).select('+password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'No account found with that email' });
        }

        if (user.provider === 'google') {
            return res.status(400).json({
                success: false,
                error: 'This account uses Google Sign-In. Password reset is not available.'
            });
        }

        // Sign a short-lived JWT using current hashed password as part of secret
        // This makes the token one-time-use: once password changes, old token is invalid
        const secret = process.env.JWT_SECRET + (user.password || '');
        const resetToken = jwt.sign(
            { id: user._id, type: 'password_reset' },
            secret,
            { expiresIn: '10m' }
        );

        res.status(200).json({
            success: true,
            message: 'Password reset token generated',
            resetToken,           // frontend uses this directly
            userName: user.name,
            expiresIn: '10 minutes'
        });
    } catch (error) {
        next(error);
    }
};

// ─── @route  PUT /api/auth/resetpassword/:resettoken ─────────────────────────
// Verifies the JWT reset token, then updates the password.
exports.resetPassword = async (req, res, next) => {
    try {
        const { resettoken } = req.params;

        if (!req.body.password || req.body.password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        // Decode token header to get user id without verifying (we need the password first)
        let decoded;
        try {
            decoded = jwt.decode(resettoken);
        } catch {
            return res.status(400).json({ success: false, error: 'Invalid reset token' });
        }

        if (!decoded?.id || decoded?.type !== 'password_reset') {
            return res.status(400).json({ success: false, error: 'Invalid reset token' });
        }

        // Fetch user with current hashed password to reconstruct the secret
        const user = await User.findById(decoded.id).select('+password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify the JWT using secret = JWT_SECRET + current hashed password
        const secret = process.env.JWT_SECRET + (user.password || '');
        try {
            jwt.verify(resettoken, secret);
        } catch (err) {
            const msg = err.name === 'TokenExpiredError'
                ? 'Reset token has expired. Please request a new one.'
                : 'Invalid reset token';
            return res.status(400).json({ success: false, error: msg });
        }

        // Set new password (pre-save hook will hash it)
        user.password = req.body.password;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};
