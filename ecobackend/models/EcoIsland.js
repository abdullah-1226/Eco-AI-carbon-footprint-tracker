const mongoose = require('mongoose');

const GridCellSchema = new mongoose.Schema({
    x:           { type: Number, required: true, min: 0, max: 9 },
    y:           { type: Number, required: true, min: 0, max: 9 },
    item_id:     { type: String, required: true },
    level:       { type: Number, default: 1, min: 1, max: 3 },
    co2_per_day: { type: Number, default: 0 },
    placed_at:   { type: Date, default: Date.now },
}, { _id: false });

const EcoIslandSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    island_name:   { type: String, default: 'My Eco Island' },
    grid:          { type: [GridCellSchema], default: [] },
    health_score:  { type: Number, default: 100, min: 0, max: 100 },
    eco_credits:   { type: Number, default: 100 }, // start with 100 credits
    total_earned:  { type: Number, default: 100 },
    total_spent:   { type: Number, default: 0 },
    last_decay_date: { type: String, default: null }, // "YYYY-MM-DD"
}, { timestamps: true });

module.exports = mongoose.model('EcoIsland', EcoIslandSchema);
