const axios        = require('axios');
const CarbonOffset = require('../models/CarbonOffset');
const UserStats    = require('../models/UserStats');
const Activity     = require('../models/Activity');
const User         = require('../models/User');

const ECOLOGI_BASE = 'https://public.ecologi.com';
const ecologiHdr   = () => ({ Authorization: `Bearer ${process.env.ECOLOGI_API_KEY}`, 'Content-Type': 'application/json' });

// Available offset programs (simulated — in-app, no external companies)
const OFFSET_PROGRAMS = [
    {
        id: 'tree_planting', name: 'Plant a Tree 🌳', icon: '🌳',
        description: 'Virtually plant a tree through EcoTrack AI. Each tree absorbs ~21 kg CO₂ per year and supports local biodiversity.',
        pricePerUnit: 0, co2PerUnit: 21, unit: 'tree',
        color: '#2D6A4F', colorLight: 'rgba(45,106,79,0.18)',
    },
    {
        id: 'solar_pledge', name: 'Solar Energy Pledge ☀️', icon: '☀️',
        description: 'Pledge to use solar energy for one month. Switching to solar offsets ~150 kg CO₂ compared to grid electricity.',
        pricePerUnit: 0, co2PerUnit: 150, unit: 'month',
        color: '#E76F51', colorLight: 'rgba(231,111,81,0.18)',
    },
    {
        id: 'no_car_day', name: 'Car-Free Day 🚶', icon: '🚶',
        description: 'Commit to a car-free day — walk, cycle, or use public transport. Each car-free day saves up to 5 kg CO₂.',
        pricePerUnit: 0, co2PerUnit: 5, unit: 'day',
        color: '#457B9D', colorLight: 'rgba(69,123,157,0.18)',
    },
    {
        id: 'veg_meal', name: 'Vegetarian Meal 🥗', icon: '🥗',
        description: 'Replace a meat-based meal with a plant-based one. Each vegetarian meal saves ~2.5 kg CO₂ vs a beef meal.',
        pricePerUnit: 0, co2PerUnit: 2.5, unit: 'meal',
        color: '#52B788', colorLight: 'rgba(82,183,136,0.18)',
    },
    {
        id: 'recycle_pledge', name: 'Recycling Pledge ♻️', icon: '♻️',
        description: 'Commit to recycling all plastic, paper, and glass for one week. Recycling one week offsets ~10 kg CO₂.',
        pricePerUnit: 0, co2PerUnit: 10, unit: 'week',
        color: '#606C38', colorLight: 'rgba(96,108,56,0.18)',
    },
    {
        id: 'energy_saving', name: 'Energy Saving Mode 💡', icon: '💡',
        description: 'Turn off unused lights and unplug devices for a day. Small energy savings add up to ~3 kg CO₂ per day.',
        pricePerUnit: 0, co2PerUnit: 3, unit: 'day',
        color: '#F4A261', colorLight: 'rgba(244,162,97,0.18)',
    },
    {
        id: 'local_food', name: 'Buy Local Food 🛒', icon: '🛒',
        description: 'Buy locally sourced food instead of imported products. Reduces food transport emissions by ~8 kg CO₂ per shop.',
        pricePerUnit: 0, co2PerUnit: 8, unit: 'shop',
        color: '#8338EC', colorLight: 'rgba(131,56,236,0.18)',
    },
    {
        id: 'cold_wash', name: 'Cold Wash Laundry 🫧', icon: '🫧',
        description: 'Wash clothes at 30°C instead of 60°C. Cold washing saves ~0.6 kg CO₂ per load and uses 60% less energy.',
        pricePerUnit: 0, co2PerUnit: 0.6, unit: 'load',
        color: '#1D3557', colorLight: 'rgba(29,53,87,0.18)',
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

        const uid = req.user._id.toString();

        const offset = await CarbonOffset.create({
            user:        uid,
            program:     program.id,
            programName: program.name,
            programIcon: program.icon,
            amount,
            co2Offset,
        });

        // Award eco points for offsetting
        const stats = await UserStats.findOne({ user: uid });
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
        const uid = req.user._id.toString();
        const offsets = await CarbonOffset.find({ user: uid });
        const totalOffset = offsets.reduce((s, o) => s + o.co2Offset, 0);

        const stats = await UserStats.findOne({ user: uid });
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
        const history = await CarbonOffset.find({ user: req.user._id.toString() }).sort({ date: -1 }).limit(50);
        res.status(200).json({ success: true, data: history });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/offset/community-goal ───────────────────────────────────
// Total CO₂ offset by ALL users combined toward a shared community target
exports.getCommunityGoal = async (req, res, next) => {
    try {
        const offsets     = await CarbonOffset.find();
        const totalOffset = offsets.reduce((s, o) => s + (o.co2Offset || 0), 0);
        const userCount   = await UserStats.countDocuments();
        const GOAL        = 10000; // kg CO₂ — community milestone

        res.json({
            success:      true,
            totalOffset:  parseFloat(totalOffset.toFixed(2)),
            communityGoal: GOAL,
            progress:     parseFloat(Math.min((totalOffset / GOAL) * 100, 100).toFixed(1)),
            userCount,
            milestonesHit: Math.floor(totalOffset / GOAL),
        });
    } catch (err) { next(err); }
};

// ─── @route  GET /api/offset/check-limit ──────────────────────────────────────
// Returns whether today's emissions exceed the user's daily threshold
exports.checkEmissionLimit = async (req, res, next) => {
    try {
        const uid   = req.user._id.toString();
        const user  = await User.findById(uid);
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const acts         = await Activity.find({ user: uid, date: { $gte: today } });
        const todayKg      = acts.reduce((s, a) => s + (a.co2e || 0), 0);
        const threshold    = user.dailyThreshold ?? 10;
        const exceeded     = todayKg > threshold;
        const excessKg     = Math.max(0, todayKg - threshold);

        res.json({
            success: true,
            exceeded,
            todayKg:   parseFloat(todayKg.toFixed(2)),
            threshold,
            excessKg:  parseFloat(excessKg.toFixed(2)),
        });
    } catch (err) { next(err); }
};

// Carbon offset projects — Pakistan-based organisations only
const ECOLOGI_PROJECTS = [
    {
        id: 'eco_wwf_pakistan',
        name: 'WWF Pakistan — Tree Planting 🇵🇰',
        description: 'WWF Pakistan runs reforestation drives across KPK, Gilgit-Baltistan and Balochistan, restoring degraded hillside forests and protecting native wildlife corridors.',
        country: 'PK', type: 'tree_planting', verifier: 'WWF Pakistan',
        amount_per_tonne_cents_usd: 890,
        donate_url: 'https://wwf.org.pk',
    },
    {
        id: 'eco_environment_pk',
        name: 'Pakistan Environment Ministry 🇵🇰',
        description: 'Official portal of Pakistan\'s Ministry of Environment — overseeing the national Billion Tree programme, clean air initiatives, and biodiversity protection across all provinces.',
        country: 'PK', type: 'tree_planting', verifier: 'Govt of Pakistan',
        amount_per_tonne_cents_usd: 750,
        donate_url: 'https://environment.gov.pk',
    },
    {
        id: 'eco_shehri',
        name: 'Shehri — Citizens for Better Environment 🇵🇰',
        description: 'Karachi-based citizens\' organisation fighting for cleaner air, greener urban spaces, and sustainable city planning in Pakistan\'s major cities since 1991.',
        country: 'PK', type: 'portfolio', verifier: 'Shehri NGO',
        amount_per_tonne_cents_usd: 800,
        donate_url: 'https://www.shehri.org',
    },
    {
        id: 'eco_mocc_pakistan',
        name: 'Ministry of Climate Change 🇵🇰',
        description: 'Pakistan\'s official climate ministry driving the national clean energy targets, reforestation goals, and forest carbon sequestration programmes under Pakistan\'s NDCs.',
        country: 'PK', type: 'portfolio', verifier: 'Govt of Pakistan',
        amount_per_tonne_cents_usd: 700,
        donate_url: 'https://mocc.gov.pk',
    },
    {
        id: 'eco_akrsp',
        name: 'AKRSP — Northern Pakistan Forests 🇵🇰',
        description: 'Aga Khan Rural Support Programme restores forests and promotes sustainable land use in Gilgit-Baltistan and Chitral — one of Pakistan\'s most ecologically vital mountain regions.',
        country: 'PK', type: 'forests', verifier: 'AKRSP',
        amount_per_tonne_cents_usd: 850,
        donate_url: 'https://www.akrsp.org.pk',
    },
    {
        id: 'eco_sdpi',
        name: 'SDPI — Green Economy Pakistan 🇵🇰',
        description: 'Sustainable Development Policy Institute promotes green economy and low-carbon policies in Pakistan — including renewable energy transitions and carbon market readiness.',
        country: 'PK', type: 'solar', verifier: 'SDPI',
        amount_per_tonne_cents_usd: 900,
        donate_url: 'https://www.sdpi.org',
    },
    {
        id: 'eco_paksolar',
        name: 'Pakistan Solar Association 🇵🇰',
        description: 'National body promoting solar energy adoption across Pakistan — supporting households, farms, and businesses in switching to clean solar power to reduce carbon emissions.',
        country: 'PK', type: 'solar', verifier: 'PakSolar',
        amount_per_tonne_cents_usd: 650,
        donate_url: 'https://www.paksolar.org',
    },
    {
        id: 'eco_greenearth_pk',
        name: 'Green Earth Pakistan 🇵🇰',
        description: 'Pakistani environmental organisation focused on tree plantation drives, clean water campaigns, and community-led conservation projects across urban and rural Pakistan.',
        country: 'PK', type: 'tree_planting', verifier: 'Green Earth PK',
        amount_per_tonne_cents_usd: 820,
        donate_url: 'https://greenearth.pk',
    },
];

// ─── @route  GET /api/offset/patch/projects ───────────────────────────────────
// Returns Ecologi project options (no live API call needed — Ecologi manages portfolio)
exports.getPatchProjects = (req, res) => {
    res.json({ success: true, source: 'pakistan', data: ECOLOGI_PROJECTS });
};

// ─── @route  GET /api/offset/patch/estimate?mass_kg=X ────────────────────────
// Ecologi pricing: ~£10/tonne ≈ $12.70/tonne
exports.getPatchEstimate = async (req, res, next) => {
    try {
        const mass_kg  = parseFloat(req.query.mass_kg) || 1;
        const mass_g   = mass_kg * 1000;
        // £10/tonne × 1.27 (GBP→USD) = $12.70/tonne → $0.01270/kg
        const price_cents_usd = Math.round(mass_kg * 1.270);
        res.json({ success: true, source: 'ecologi',
            data: { mass_g, price_cents_usd } });
    } catch (err) { next(err); }
};

// ─── @route  POST /api/offset/patch/order ────────────────────────────────────
// Creates real Ecologi offset (test:true = sandbox, no charge; test:false = real)
exports.createPatchOrder = async (req, res, next) => {
    try {
        const { mass_kg, project_id } = req.body;
        if (!mass_kg || mass_kg <= 0)
            return res.status(400).json({ success: false, error: 'mass_kg required' });

        const kg     = parseFloat(mass_kg);
        // Ecologi takes whole tonnes — minimum 1 tonne; round up to nearest tonne
        const tonnes = Math.max(1, Math.round(kg / 1000)) || 1;
        const key    = process.env.ECOLOGI_API_KEY;
        let ecologiData = null;

        if (key) {
            try {
                if (project_id === 'eco_trees') {
                    const trees = Math.max(1, Math.ceil(kg / 21));
                    const r = await axios.post(`${ECOLOGI_BASE}/impact/trees`,
                        { number: trees, name: 'EcoTrack AI User' },
                        { headers: ecologiHdr() }
                    );
                    ecologiData = { ...r.data, type: 'trees', trees };
                } else {
                    const r = await axios.post(`${ECOLOGI_BASE}/impact/carbon`,
                        { number: kg, units: 'KG' },
                        { headers: ecologiHdr() }
                    );
                    ecologiData = { ...r.data, type: 'carbon' };
                }
            } catch (e) {
                // Log full error so we can debug
                console.log('Ecologi API error:', JSON.stringify(e.response?.data || e.message));
            }
        }

        // Cost: Ecologi returns GBP → convert to USD approx
        const costUSD = ecologiData?.cost
            ? parseFloat((ecologiData.cost * 1.27).toFixed(4))
            : parseFloat((kg * 0.01270).toFixed(4));

        const programName = project_id === 'eco_trees'
            ? 'Tree Planting via Ecologi'
            : (ECOLOGI_PROJECTS.find(p => p.id === project_id)?.name || 'Carbon Offset via Ecologi');

        const programIcon = project_id === 'eco_trees' ? '🌳' : '🌍';

        const offset = await CarbonOffset.create({
            user: req.user.id, program: project_id || 'ecologi_carbon',
            programName, programIcon,
            amount:    costUSD,
            co2Offset: parseFloat(kg.toFixed(2)),
        });

        const stats = await UserStats.findOne({ user: req.user.id });
        if (stats) {
            stats.totalPoints += Math.round(kg * 10);
            // Award offset badges
            const totalOffsetKg = (await CarbonOffset.find({ user: req.user.id }))
                .reduce((s, o) => s + o.co2Offset, 0) + kg;
            const hasBadge = (id) => stats.badges.some(b => b.id === id);
            if (!hasBadge('offset_50') && totalOffsetKg >= 50)
                stats.badges.push({ id: 'offset_50', name: 'Offset Hero', icon: '🌿', description: 'Offset 50 kg CO₂' });
            if (!hasBadge('offset_100') && totalOffsetKg >= 100)
                stats.badges.push({ id: 'offset_100', name: 'Carbon Slayer', icon: '⚔️', description: 'Offset 100 kg CO₂' });
            await stats.save();
        }

        let message;
        if (ecologiData?.type === 'trees') {
            message = `✅ ${ecologiData.trees} trees planted via Ecologi — offsetting ${kg.toFixed(1)} kg CO₂!`;
        } else if (ecologiData) {
            message = `✅ ${kg.toFixed(1)} kg CO₂ offset via Ecologi! 🌍`;
        } else {
            message = `✅ ${kg.toFixed(1)} kg CO₂ offset recorded! Add ECOLOGI_API_KEY for live API.`;
        }

        res.status(201).json({ success: true, message, data: { offset, ecologiData } });
    } catch (err) { next(err); }
};
