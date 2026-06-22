const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
    id:          String,
    name:        String,
    icon:        String,
    description: String,
    earnedAt:    { type: Date, default: Date.now },
});

const UserStatsSchema = new mongoose.Schema({
    user:                 { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ecoScore:             { type: Number, default: 50 },
    totalPoints:          { type: Number, default: 0 },
    totalCo2e:            { type: Number, default: 0 },   // lifetime kg CO₂
    totalActivities:      { type: Number, default: 0 },
    currentStreak:        { type: Number, default: 0 },
    longestStreak:        { type: Number, default: 0 },
    lastActivityDate:     { type: Date },
    badges:               [BadgeSchema],
    level:                { type: Number, default: 1 },
    weeklyEmissions:      { type: Number, default: 0 },
    monthlyEmissions:     { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('UserStats', UserStatsSchema);
