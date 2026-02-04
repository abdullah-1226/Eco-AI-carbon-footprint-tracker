const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Welcome to my_project1 API',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                logout: 'GET /api/auth/logout',
                getMe: 'GET /api/auth/me',
                updateDetails: 'PUT /api/auth/updatedetails',
                updatePassword: 'PUT /api/auth/updatepassword'
            },
            posts: {
                getAll: 'GET /api/posts',
                getSingle: 'GET /api/posts/:id',
                create: 'POST /api/posts',
                update: 'PUT /api/posts/:id',
                delete: 'DELETE /api/posts/:id',
                getByUser: 'GET /api/posts/user/:userId',
                like: 'PUT /api/posts/:id/like'
            },
            dashboard: {
                main: 'GET /api/dashboard',
                stats: 'GET /api/dashboard/stats',
                admin: 'GET /api/dashboard/admin'
            }
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const statusMap = {
        0: '🔴 Disconnected',
        1: '🟢 Connected',
        2: '🟡 Connecting',
        3: '🟠 Disconnecting'
    };
    
    res.json({
        status: 'OK',
        timestamp: new Date(),
        uptime: Math.floor(process.uptime()),
        database: {
            status: statusMap[dbStatus] || '⚫ Unknown',
            readyState: dbStatus
        },
        memory: process.memoryUsage()
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

// Error handler middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Server Information:');
    console.log('='.repeat(50));
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
    console.log('='.repeat(50));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Unhandled Rejection: ${err.message}`);
    console.log(err.stack);
    server.close(() => process.exit(1));
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
