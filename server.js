const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/error');

dotenv.config();
connectDB();

const authRoutes      = require('./routes/authRoutes');
const postRoutes      = require('./routes/postRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const activityRoutes  = require('./routes/activityRoutes');
const chatbotRoutes   = require('./routes/chatbotRoutes');
const mapsRoutes      = require('./routes/mapsRoutes');
const alertRoutes     = require('./routes/alertRoutes');
const offsetRoutes    = require('./routes/offsetRoutes');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth',       authRoutes);
app.use('/api/posts',      postRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/chatbot',    chatbotRoutes);
app.use('/api/maps',       mapsRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/offset',     offsetRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🌿 Welcome to EcoTrack AI — Carbon Footprint Tracker API',
        version: '1.0.0',
        project: 'FYP — Eco AI Carbon Footprint Tracker',
        endpoints: {
            auth: {
                register:        'POST /api/auth/register',
                login:           'POST /api/auth/login',
                googleSignIn:    'POST /api/auth/google',
                forgotPassword:  'POST /api/auth/forgotpassword',
                resetPassword:   'PUT  /api/auth/resetpassword/:token',
                getMe:           'GET  /api/auth/me',
                updateDetails:   'PUT  /api/auth/updatedetails',
                updatePassword:  'PUT  /api/auth/updatepassword',
                logout:          'GET  /api/auth/logout'
            }
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const statusMap = { 0: '🔴 Disconnected', 1: '🟢 Connected', 2: '🟡 Connecting', 3: '🟠 Disconnecting' };
    res.json({
        status: 'OK',
        app: 'EcoTrack AI',
        timestamp: new Date(),
        uptime: Math.floor(process.uptime()),
        database: { status: statusMap[dbStatus] || '⚫ Unknown', readyState: dbStatus },
        memory: process.memoryUsage()
    });
});

app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

// ─── Daily Reminder Cron (8 PM every day) ────────────────────────────────────
try {
    const cron          = require('node-cron');
    const User          = require('./models/User');
    const Activity      = require('./models/Activity');
    const EmissionAlert = require('./models/EmissionAlert');

    cron.schedule('0 20 * * *', async () => {
        try {
            const users = await User.find({}).select('_id');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            for (const u of users) {
                const hasActivity = await Activity.findOne({ user: u._id, date: { $gte: today } });
                if (!hasActivity) {
                    await EmissionAlert.create({
                        user:      u._id,
                        alertType: 'daily_reminder',
                        title:     '🌿 Daily Reminder',
                        message:   "You haven't logged any activities today. Keep your eco streak alive!",
                        icon:      '⏰',
                    });
                }
            }
            console.log('✅ Daily reminder cron completed');
        } catch (e) { console.error('❌ Cron error:', e.message); }
    });
    console.log('⏰  Cron scheduler: daily reminders enabled (8 PM)');
} catch (_) {
    console.log('⚠️  node-cron not available — daily reminders disabled');
}

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(55));
    console.log('🌿  EcoTrack AI — Carbon Footprint Tracker');
    console.log('='.repeat(55));
    console.log(`📡  Environment : ${process.env.NODE_ENV}`);
    console.log(`🔌  Port        : ${PORT}`);
    console.log(`🌐  URL         : http://localhost:${PORT}`);
    console.log(`📊  MongoDB     : ${process.env.MONGODB_URI}`);
    console.log('='.repeat(55));
});

process.on('unhandledRejection', (err) => {
    console.log(`❌ Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    server.close(() => { console.log('✅ Server closed'); process.exit(0); });
});
