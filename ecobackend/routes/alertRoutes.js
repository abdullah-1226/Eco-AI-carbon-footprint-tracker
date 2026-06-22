const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
    getAlerts, getUnreadCount, markRead, markAllRead, deleteAlert,
} = require('../controllers/alertController');

router.use(protect);

router.get('/',              getAlerts);
router.get('/unread-count',  getUnreadCount);
router.put('/read-all',      markAllRead);
router.put('/:id/read',      markRead);
router.delete('/:id',        deleteAlert);

module.exports = router;
