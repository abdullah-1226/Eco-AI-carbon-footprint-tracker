const express = require('express');
const router = express.Router();
const {
    getDashboard,
    getDashboardStats,
    getAdminDashboard
} = require('../controllers/dashboardController');

const { protect, authorize } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

router.get('/', getDashboard);
router.get('/stats', getDashboardStats);
router.get('/admin', authorize('admin'), getAdminDashboard);

module.exports = router;
