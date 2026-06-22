const mongoose = require('mongoose');

const CarbonOffsetSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    program:     { type: String, required: true },
    programName: { type: String, required: true },
    programIcon: { type: String, default: '🌱' },
    amount:    { type: Number, required: true },   // cost in USD (simulated)
    co2Offset: { type: Number, required: true },   // kg CO₂ offset
    date:   { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'confirmed'], default: 'confirmed' },
    notes:  { type: String, default: '' },
});

CarbonOffsetSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('CarbonOffset', CarbonOffsetSchema);
