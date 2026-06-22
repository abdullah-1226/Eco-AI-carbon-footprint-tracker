const axios        = require('axios');
const CarbonOffset = require('../models/CarbonOffset');
const UserStats    = require('../models/UserStats');
const Activity     = require('../models/Activity');
const User         = require('../models/User');

const ECOLOGI_BASE = 'https://public.ecologi.com';
const ecologiHdr   = () => ({ Authorization: `Bearer ${process.env.ECOLOGI_API_KEY}`, 'Content-Type': 'application/json' });

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
        const user  = await User.findById(req.user.id);
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const acts         = await Activity.find({ user: req.user.id, date: { $gte: today } });
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

// Ecologi-powered project options
// For actual offset, all routes through Ecologi API — project_id determines carbon vs trees
const ECOLOGI_PROJECTS = [
    {
        id: 'eco_carbon_portfolio',
        name: 'Ecologi Carbon Portfolio',
        description: 'Offsets your CO₂ through Ecologi\'s curated Gold Standard & VCS verified portfolio spanning forests, wind farms, and clean cookstoves across 20+ countries.',
        country: 'GB', type: 'portfolio', verifier: 'Gold Standard',
        amount_per_tonne_cents_usd: 1270,   // ~£10/tonne ≈ $12.70
        donate_url: 'https://ecologi.com/offset',
    },
    {
        id: 'eco_trees',
        name: 'Plant Trees via Ecologi',
        description: 'Plant verified trees in areas of greatest ecological need. Each tree absorbs ~21 kg CO₂ over its lifetime. Ecologi plants in the most impactful regions globally.',
        country: 'GB', type: 'tree_planting', verifier: 'Ecologi Verified',
        amount_per_tonne_cents_usd: 1810,   // ~£0.30/tree × (1000/21) per tonne
        donate_url: 'https://ecologi.com/plant-trees',
    },
    {
        id: 'eco_pakistan_forest',
        name: 'Pakistan Billion Tree Restoration',
        description: 'Community-led reforestation across KPK and Balochistan. Supports Pakistan\'s national Billion Tree Tsunami initiative restoring degraded hillsides.',
        country: 'PK', type: 'forests', verifier: 'Plan Vivo',
        amount_per_tonne_cents_usd: 890,
        donate_url: 'https://www.wwf.org.pk/our_work/reforestation.php',
    },
    {
        id: 'eco_kenya_wind',
        name: 'Kenyan Wind Power',
        description: 'Funds wind turbines across the Ngong Hills supplying clean electricity to 150,000 Kenyan homes, displacing coal and diesel generation.',
        country: 'KE', type: 'wind', verifier: 'Gold Standard',
        amount_per_tonne_cents_usd: 800,
        donate_url: 'https://ecologi.com/offset',
    },
    {
        id: 'eco_india_solar',
        name: 'Rural Solar — India',
        description: 'Replaces diesel irrigation pumps with solar panels across 3,000 smallholder farms in Rajasthan and Maharashtra.',
        country: 'IN', type: 'solar', verifier: 'Gold Standard',
        amount_per_tonne_cents_usd: 1000,
        donate_url: 'https://www.myclimate.org/en/offset/offset-options/',
    },
    {
        id: 'eco_amazon',
        name: 'Amazon REDD+ Conservation',
        description: 'Protects 2.1 million hectares of pristine Amazon rainforest in Pará State from illegal logging and agricultural expansion.',
        country: 'BR', type: 'forests', verifier: 'Verra',
        amount_per_tonne_cents_usd: 1500,
        donate_url: 'https://www.cooleffect.org',
    },
    {
        id: 'eco_cookstoves',
        name: 'Clean Cookstoves — Africa',
        description: 'Distributes efficient cookstoves to 80,000 households in Sub-Saharan Africa, cutting wood consumption 60% and reducing indoor air pollution.',
        country: 'KE', type: 'biomass', verifier: 'Gold Standard',
        amount_per_tonne_cents_usd: 900,
        donate_url: 'https://ecologi.com/offset',
    },
    {
        id: 'eco_ocean',
        name: 'Blue Carbon — Pacific Mangroves',
        description: 'Restores mangrove ecosystems in Fiji and Vanuatu. Mangroves sequester 5× more carbon per hectare than tropical forests.',
        country: 'FJ', type: 'ocean', verifier: 'Verra',
        amount_per_tonne_cents_usd: 2000,
        donate_url: 'https://www.cooleffect.org',
    },
];

// ─── @route  GET /api/offset/patch/projects ───────────────────────────────────
// Returns Ecologi project options (no live API call needed — Ecologi manages portfolio)
exports.getPatchProjects = (req, res) => {
    res.json({ success: true, source: 'ecologi', data: ECOLOGI_PROJECTS });
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
