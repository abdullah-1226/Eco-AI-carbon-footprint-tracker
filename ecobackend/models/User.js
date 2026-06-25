const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // Google OAuth fields
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String,
        default: null
    },
    coverPhoto: {
        type: String,
        default: null
    },
    age: {
        type: Number,
        min: 1, max: 120,
        default: null
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'non-binary', 'prefer_not_to_say', null],
        default: null
    },
    bio: {
        type: String,
        maxlength: 200,
        default: null
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Notifications & alerts
    fcmToken:       { type: String, default: null },
    dailyThreshold:      { type: Number,  default: 10    },  // kg CO₂/day threshold
    onboardingComplete:  { type: Boolean, default: false  },  // has user set their goal?

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Encrypt password using bcrypt (only for local accounts)
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match entered password to hashed password
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash it and set on schema
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken; // return unhashed token (sent to user via email)
};

module.exports = mongoose.model('User', UserSchema);
