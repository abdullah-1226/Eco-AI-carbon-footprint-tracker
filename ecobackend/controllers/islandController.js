const EcoIsland = require('../models/EcoIsland');

// ── Item catalogue (source of truth) ─────────────────────────────────────────
const CATALOGUE = {
    tree_sapling:    { name: 'Sapling',        emoji: '🌱', cost: 50,   co2: 1.5,  tier: 'basic',    unlock: 0  },
    tree_mature:     { name: 'Mature Tree',    emoji: '🌳', cost: 150,  co2: 4.0,  tier: 'basic',    unlock: 15 },
    solar_panel:     { name: 'Solar Panel',    emoji: '☀️', cost: 300,  co2: 7.0,  tier: 'advanced', unlock: 25 },
    wind_turbine:    { name: 'Wind Turbine',   emoji: '🌬️', cost: 500,  co2: 12.0, tier: 'advanced', unlock: 40 },
    ocean_cleaner:   { name: 'Ocean Cleaner',  emoji: '🌊', cost: 750,  co2: 15.0, tier: 'elite',    unlock: 60 },
    forest_preserve: { name: 'Forest Reserve', emoji: '🏞️', cost: 1200, co2: 25.0, tier: 'elite',    unlock: 75 },
    solar_farm:      { name: 'Solar Farm',     emoji: '⚡', cost: 2000, co2: 40.0, tier: 'elite',    unlock: 90 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

const computeDecay = (island) => {
    const totalCO2Power = island.grid.reduce((s, c) => s + (c.co2_per_day || 0), 0);
    const cushion = Math.min(1.9, totalCO2Power / 50);
    return parseFloat((2.0 - cushion).toFixed(2));
};

const computeBonus = (carbonKg, dailyLimit = 6.8) => {
    if (carbonKg >= dailyLimit) return 0;
    const ratio = 1 - carbonKg / dailyLimit;
    return Math.floor(20 + 80 * ratio); // 20–100 credits
};

// ── @route  GET /api/island  ──────────────────────────────────────────────────
exports.getIsland = async (req, res, next) => {
    try {
        const uid = req.user._id.toString();
        let island = await EcoIsland.findOne({ user: uid });

        // First-time: create island
        if (!island) {
            island = await EcoIsland.create({ user: uid });
        }

        // Apply daily health decay once per day
        const today = todayStr();
        if (island.last_decay_date !== today) {
            const decay   = computeDecay(island);
            island.health_score    = Math.max(0, island.health_score - decay);
            island.last_decay_date = today;
            await island.save();
        }

        // Build shop catalogue enriched with affordability
        const shop = Object.entries(CATALOGUE).map(([id, meta]) => ({
            item_id:     id,
            ...meta,
            can_afford:  island.eco_credits >= meta.cost,
            is_unlocked: island.health_score >= meta.unlock,
        }));

        res.status(200).json({ success: true, island, shop });
    } catch (err) { next(err); }
};

// ── @route  POST /api/island/earn  ───────────────────────────────────────────
// Called after an activity is logged. Body: { carbon_kg, daily_limit }
exports.earnCredits = async (req, res, next) => {
    try {
        const uid = req.user._id.toString();
        const { carbon_kg = 0, daily_limit = 6.8 } = req.body;
        const bonus = computeBonus(parseFloat(carbon_kg), parseFloat(daily_limit));

        if (bonus === 0) {
            return res.status(200).json({
                success: true, credits_earned: 0,
                message: 'No bonus — emissions at or above daily limit.',
            });
        }

        const healthGain = Math.min(5, Math.round(bonus / 20));

        const island = await EcoIsland.findOneAndUpdate(
            { user: uid },
            {
                $inc: { eco_credits: bonus, total_earned: bonus },
                $set: { health_score: { $min: [100, { $add: ['$health_score', healthGain] }] } },
            },
            { new: true, upsert: true }
        );

        // Health increment needs a second atomic op (MongoDB 4+ pipeline update)
        await EcoIsland.findOneAndUpdate(
            { user: uid },
            [{ $set: { health_score: { $min: [100, { $add: ['$health_score', healthGain] }] } } }]
        );

        res.status(200).json({
            success: true,
            credits_earned: bonus,
            health_gained:  healthGain,
            message: `🌱 Green day! +${bonus} Eco-Credits earned.`,
        });
    } catch (err) { next(err); }
};

// ── @route  POST /api/island/place  ──────────────────────────────────────────
// Body: { item_id, x, y }
exports.placeItem = async (req, res, next) => {
    try {
        const uid = req.user._id.toString();
        const { item_id, x, y } = req.body;
        const meta = CATALOGUE[item_id];
        if (!meta) return res.status(400).json({ success: false, error: 'Invalid item.' });

        const island = await EcoIsland.findOne({ user: uid });
        if (!island) return res.status(404).json({ success: false, error: 'Island not found.' });

        if (island.health_score < meta.unlock)
            return res.status(403).json({ success: false, error: `Unlock this item at ${meta.unlock}% island health.` });

        if (island.eco_credits < meta.cost)
            return res.status(402).json({ success: false, error: 'Not enough Eco-Credits.' });

        const occupied = island.grid.some(c => c.x === x && c.y === y);
        if (occupied)
            return res.status(409).json({ success: false, error: `Cell (${x},${y}) is already occupied.` });

        island.grid.push({ x, y, item_id, co2_per_day: meta.co2, level: 1 });
        island.eco_credits -= meta.cost;
        island.total_spent += meta.cost;
        await island.save();

        res.status(200).json({
            success: true,
            message: `${meta.emoji} ${meta.name} placed!`,
            island,
        });
    } catch (err) { next(err); }
};

// ── @route  DELETE /api/island/remove/:x/:y  ─────────────────────────────────
exports.removeItem = async (req, res, next) => {
    try {
        const uid = req.user._id.toString();
        const x = parseInt(req.params.x);
        const y = parseInt(req.params.y);

        const island = await EcoIsland.findOneAndUpdate(
            { user: uid },
            { $pull: { grid: { x, y } } },
            { new: true }
        );
        if (!island) return res.status(404).json({ success: false, error: 'Island not found.' });

        res.status(200).json({ success: true, message: `Item at (${x},${y}) removed.`, island });
    } catch (err) { next(err); }
};
