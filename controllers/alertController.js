const EmissionAlert = require('../models/EmissionAlert');

// ─── @route  GET /api/alerts ──────────────────────────────────────────────────
exports.getAlerts = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const alerts = await EmissionAlert.find({ user: req.user.id })
            .sort({ triggeredAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const unreadCount = await EmissionAlert.countDocuments({ user: req.user.id, isRead: false });
        const total       = await EmissionAlert.countDocuments({ user: req.user.id });

        res.status(200).json({ success: true, data: alerts, total, unreadCount });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/alerts/unread-count ─────────────────────────────────────
exports.getUnreadCount = async (req, res, next) => {
    try {
        const count = await EmissionAlert.countDocuments({ user: req.user.id, isRead: false });
        res.status(200).json({ success: true, count });
    } catch (err) {
        next(err);
    }
};

// ─── @route  PUT /api/alerts/:id/read ────────────────────────────────────────
exports.markRead = async (req, res, next) => {
    try {
        const alert = await EmissionAlert.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
        res.status(200).json({ success: true, data: alert });
    } catch (err) {
        next(err);
    }
};

// ─── @route  PUT /api/alerts/read-all ────────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
    try {
        await EmissionAlert.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: 'All alerts marked as read' });
    } catch (err) {
        next(err);
    }
};

// ─── @route  DELETE /api/alerts/:id ──────────────────────────────────────────
exports.deleteAlert = async (req, res, next) => {
    try {
        const alert = await EmissionAlert.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
        res.status(200).json({ success: true, message: 'Alert deleted' });
    } catch (err) {
        next(err);
    }
};
