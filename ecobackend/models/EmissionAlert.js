const mongoose = require('mongoose');

const EmissionAlertSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    alertType: {
        type: String,
        enum: ['threshold_exceeded', 'daily_reminder', 'badge_earned', 'milestone', 'weekly_report',
               'challenge_invite', 'challenge_accepted', 'challenge_won', 'challenge_lost'],
        default: 'threshold_exceeded',
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    icon:    { type: String, default: '⚠️' },
    isRead:  { type: Boolean, default: false },
    triggeredAt: { type: Date, default: Date.now },
});

EmissionAlertSchema.index({ user: 1, triggeredAt: -1 });

module.exports = mongoose.model('EmissionAlert', EmissionAlertSchema);
