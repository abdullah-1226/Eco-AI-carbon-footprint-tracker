const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
    challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    opponent:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    metric: {
        type: String,
        enum: ['eco_score', 'activities_count', 'streak', 'co2_saved'],
        default: 'eco_score',
    },
    duration_days: { type: Number, default: 7 }, // 7, 14, or 30

    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'declined'],
        default: 'pending',
    },

    // Snapshots taken when challenge starts
    challenger_start: { type: Number, default: 0 },
    opponent_start:   { type: Number, default: 0 },

    // Final values when challenge ends
    challenger_final: { type: Number, default: null },
    opponent_final:   { type: Number, default: null },

    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    badge_awarded: { type: String, default: null }, // badge id awarded to winner

    starts_at:  { type: Date, default: null },
    ends_at:    { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', ChallengeSchema);
