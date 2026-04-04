const CarbonOffset = require('../models/CarbonOffset');
const UserStats    = require('../models/UserStats');

// Available offset programs (simulated — FYP purposes)
const OFFSET_PROGRAMS = [
    {
        id: 'tree_planting', name: 'Tree Planting', icon: '🌳',
        description: 'Plant trees in deforested regions of Pakistan and globally. Each tree absorbs ~100 kg CO₂ over its lifetime.',
        pricePerUnit: 10, co2PerUnit: 100, unit: 'tree',
        color: '#2D6A4F', colorLight: '#D8F3DC',
    },
    {
        id: 'solar_energy', name: 'Solar Energy', icon: '☀️',
        description: 'Fund solar panel installation in rural communities across South Asia, displacing fossil fuel electricity.',
        pricePerUnit: 15, co2PerUnit: 150, unit: 'panel',
        color: '#E76F51', colorLight: '#FDE8D8',
    },
    {
        id: 'wind_power', name: 'Wind Power', icon: '💨',
        description: 'Support wind farm development. Wind energy offsets 120 kg CO₂ per MWh compared to coal power.',
        pricePerUnit: 12, co2PerUnit: 120, unit: 'unit',
        color: '#457B9D', colorLight: '#D6E8F5',
    },
    {
        id: 'ocean_conservation', name: 'Ocean Conservation', icon: '🌊',
        description: 'Protect ocean ecosystems — oceans absorb 30% of global CO₂. Fund marine restoration projects.',
        pricePerUnit: 20, co2PerUnit: 200, unit: 'unit',
        color: '#1D3557', colorLight: '#D6E4F0',
    },
    {
        id: 'biogas', name: 'Biogas Initiative', icon: '♻️',
        description: 'Convert organic waste to clean energy for rural households, reducing methane emissions and deforestation.',
        pricePerUnit: 8, co2PerUnit: 80, unit: 'unit',
        color: '#606C38', colorLight: '#E5E8D3',
    },
];

// ─── @route  GET /api/offset/programs ────────────────────────────────────────
exports.getPrograms = (req, res) => {
    res.status(200).json({ success: true, data: OFFSET_PROGRAMS });
};

// ─── @route  POST /api/offset/contribute ──────────────────────────────────────
exports.contribute = async (req, res, next) => {
    try {
        const { programId, quantity = 1 } = req.body;

        const program = OFFSET_PROGRAMS.find(p => p.id === programId);
        if (!program) return res.status(400).json({ success: false, error: 'Invalid program ID' });

        const amount    = program.pricePerUnit * quantity;
        const co2Offset = program.co2PerUnit   * quantity;

        const offset = await CarbonOffset.create({
            user:        req.user.id,
            program:     program.id,
            programName: program.name,
            programIcon: program.icon,
            amount,
            co2Offset,
        });

        // Award eco points for offsetting
        const stats = await UserStats.findOne({ user: req.user.id });
        if (stats) {
            stats.totalPoints += Math.round(quantity * 20);
            await stats.save();
        }

        res.status(201).json({
            success: true,
            data: offset,
            message: `✅ You offset ${co2Offset} kg CO₂ by supporting ${program.name}!`,
        });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/offset/balance ──────────────────────────────────────────
exports.getBalance = async (req, res, next) => {
    try {
        const offsets = await CarbonOffset.find({ user: req.user.id });
        const totalOffset = offsets.reduce((s, o) => s + o.co2Offset, 0);

        const stats = await UserStats.findOne({ user: req.user.id });
        const totalGenerated = stats?.totalCo2e ?? 0;

        const netBalance = totalOffset - totalGenerated;

        res.status(200).json({
            success: true,
            totalOffset:    parseFloat(totalOffset.toFixed(2)),
            totalGenerated: parseFloat(totalGenerated.toFixed(2)),
            netBalance:     parseFloat(netBalance.toFixed(2)),
            isPositive:     netBalance >= 0,
            contributions:  offsets.length,
        });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/offset/history ──────────────────────────────────────────
exports.getHistory = async (req, res, next) => {
    try {
        const history = await CarbonOffset.find({ user: req.user.id }).sort({ date: -1 }).limit(50);
        res.status(200).json({ success: true, data: history });
    } catch (err) {
        next(err);
    }
};
