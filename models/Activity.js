const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['transport', 'food', 'energy', 'shopping'], required: true },
    subType:  { type: String, required: true },
    label:    { type: String, required: true },
    value:    { type: Number, required: true },   // km / meals / kWh / items
    unit:     { type: String, required: true },
    co2e:     { type: Number, required: true },   // kg CO₂ equivalent
    note:     { type: String, default: '' },
    date:     { type: Date, default: Date.now },
}, { timestamps: true });

ActivitySchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
