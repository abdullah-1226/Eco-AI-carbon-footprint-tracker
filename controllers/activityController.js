const Activity      = require('../models/Activity');
const UserStats     = require('../models/UserStats');
const EmissionAlert = require('../models/EmissionAlert');
const User          = require('../models/User');

// ─── Emission Factors (kg CO₂ per unit) ──────────────────────────────────────
const EF = {
    transport: {
        car_petrol:           { factor: 0.21,   unit: 'km',   label: 'Car (Petrol)' },
        car_diesel:           { factor: 0.17,   unit: 'km',   label: 'Car (Diesel)' },
        car_electric:         { factor: 0.05,   unit: 'km',   label: 'Car (Electric)' },
        motorcycle:           { factor: 0.114,  unit: 'km',   label: 'Motorcycle' },
        bus:                  { factor: 0.089,  unit: 'km',   label: 'Bus' },
        train:                { factor: 0.041,  unit: 'km',   label: 'Train' },
        flight_domestic:      { factor: 0.255,  unit: 'km',   label: 'Flight (Domestic)' },
        flight_international: { factor: 0.195,  unit: 'km',   label: 'Flight (International)' },
        bicycle:              { factor: 0,      unit: 'km',   label: 'Bicycle' },
        walking:              { factor: 0,      unit: 'km',   label: 'Walking' },
    },
    food: {
        beef_meal:    { factor: 6.61, unit: 'meal', label: 'Beef Meal' },
        pork_meal:    { factor: 2.45, unit: 'meal', label: 'Pork Meal' },
        chicken_meal: { factor: 1.24, unit: 'meal', label: 'Chicken Meal' },
        fish_meal:    { factor: 1.51, unit: 'meal', label: 'Fish Meal' },
        vegetarian:   { factor: 0.94, unit: 'meal', label: 'Vegetarian Meal' },
        vegan:        { factor: 0.70, unit: 'meal', label: 'Vegan Meal' },
    },
    energy: {
        electricity: { factor: 0.233, unit: 'kWh', label: 'Electricity' },
        natural_gas: { factor: 0.202, unit: 'kWh', label: 'Natural Gas' },
    },
    shopping: {
        clothing:          { factor: 25,  unit: 'item', label: 'Clothing' },
        electronics_small: { factor: 70,  unit: 'item', label: 'Electronics (Small)' },
        electronics_large: { factor: 300, unit: 'item', label: 'Electronics (Large)' },
        furniture:         { factor: 120, unit: 'item', label: 'Furniture' },
        grocery_bag:       { factor: 5,   unit: 'bag',  label: 'Grocery Bag' },
    },
};

// Badges definition
const BADGES = [
    { id: 'first_log',     name: 'First Step',     icon: '🌱', description: 'Logged your first activity' },
    { id: 'eco_walker',    name: 'Eco Walker',      icon: '🚶', description: '10+ walking/cycling activities' },
    { id: 'green_diet',    name: 'Green Plate',     icon: '🥗', description: '10+ vegan/vegetarian meals' },
    { id: 'streak_7',      name: '7-Day Streak',    icon: '🔥', description: 'Logged activities 7 days in a row' },
    { id: 'streak_30',     name: '30-Day Streak',   icon: '⚡', description: 'Logged activities 30 days in a row' },
    { id: 'century',       name: 'Century Logger',  icon: '💯', description: 'Logged 100 activities' },
    { id: 'low_carbon_day',name: 'Low Carbon Day',  icon: '🌍', description: 'Kept daily emissions under 5kg CO₂' },
    { id: 'energy_saver',  name: 'Energy Saver',    icon: '⚡', description: 'Logged 20+ energy-saving activities' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcCo2 = (category, subType, value) => {
    const ef = EF[category]?.[subType];
    if (!ef) return 0;
    return parseFloat((ef.factor * value).toFixed(3));
};

const calcEcoScore = (monthlyKg) => {
    // World avg ≈ 400 kg/month. Perfect score at ≤ 50 kg, 0 at ≥ 700 kg
    const score = Math.round(100 - ((monthlyKg - 50) / 650) * 100);
    return Math.min(100, Math.max(0, score));
};

const calcLevel = (points) => Math.floor(points / 200) + 1;

const updateStreak = (stats) => {
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const last      = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;

    if (!last) {
        stats.currentStreak = 1;
    } else {
        const lastDay = new Date(last); lastDay.setHours(0, 0, 0, 0);
        if (lastDay.getTime() === today.getTime()) {
            // same day — no change
        } else if (lastDay.getTime() === yesterday.getTime()) {
            stats.currentStreak += 1;
        } else {
            stats.currentStreak = 1;
        }
    }
    if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
    }
    stats.lastActivityDate = new Date();
};

const checkBadges = (stats, activity, allActivities) => {
    const newBadges = [];
    const hasBadge  = (id) => stats.badges.some(b => b.id === id);

    if (!hasBadge('first_log') && stats.totalActivities >= 1)
        newBadges.push(BADGES.find(b => b.id === 'first_log'));

    if (!hasBadge('century') && stats.totalActivities >= 100)
        newBadges.push(BADGES.find(b => b.id === 'century'));

    if (!hasBadge('streak_7') && stats.currentStreak >= 7)
        newBadges.push(BADGES.find(b => b.id === 'streak_7'));

    if (!hasBadge('streak_30') && stats.currentStreak >= 30)
        newBadges.push(BADGES.find(b => b.id === 'streak_30'));

    const ecoTransport = allActivities.filter(a =>
        a.category === 'transport' && ['bicycle', 'walking'].includes(a.subType)).length;
    if (!hasBadge('eco_walker') && ecoTransport >= 10)
        newBadges.push(BADGES.find(b => b.id === 'eco_walker'));

    const greenMeals = allActivities.filter(a =>
        a.category === 'food' && ['vegan', 'vegetarian'].includes(a.subType)).length;
    if (!hasBadge('green_diet') && greenMeals >= 10)
        newBadges.push(BADGES.find(b => b.id === 'green_diet'));

    newBadges.forEach(badge => { if (badge) stats.badges.push(badge); });
    return newBadges;
};

// ─── @route  POST /api/activities ────────────────────────────────────────────
exports.logActivity = async (req, res, next) => {
    try {
        const { category, subType, value, note, date } = req.body;

        if (!category || !subType || value == null) {
            return res.status(400).json({ success: false, error: 'category, subType, and value are required' });
        }

        const ef = EF[category]?.[subType];
        if (!ef) return res.status(400).json({ success: false, error: 'Invalid category or subType' });

        const co2e = calcCo2(category, subType, value);

        const activity = await Activity.create({
            user: req.user.id,
            category, subType,
            label: ef.label,
            value, unit: ef.unit,
            co2e,
            note: note || '',
            date: date ? new Date(date) : new Date(),
        });

        // ── Update UserStats ──────────────────────────────────────────────────
        let stats = await UserStats.findOne({ user: req.user.id });
        if (!stats) stats = new UserStats({ user: req.user.id });

        stats.totalActivities += 1;
        stats.totalCo2e       += co2e;

        // Points: base 10, +15 for eco choice, +5 for low emissions
        let points = 10;
        if (['bicycle', 'walking', 'vegan', 'vegetarian'].includes(subType)) points += 15;
        if (co2e < 1) points += 5;
        stats.totalPoints += points;
        stats.level        = calcLevel(stats.totalPoints);

        updateStreak(stats);

        // Recalc monthly emissions
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const monthlyAgg = await Activity.aggregate([
            { $match: { user: activity.user, date: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$co2e' } } },
        ]);
        stats.monthlyEmissions = monthlyAgg[0]?.total ?? 0;
        stats.ecoScore         = calcEcoScore(stats.monthlyEmissions);

        // Badges
        const allActivities = await Activity.find({ user: req.user.id }).select('category subType');
        const newBadges     = checkBadges(stats, activity, allActivities);

        await stats.save();

        // ── Emission Alert Check ──────────────────────────────────────────────
        try {
            const userDoc = await User.findById(req.user.id).select('dailyThreshold');
            const threshold = userDoc?.dailyThreshold ?? 10;

            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const todayAgg   = await Activity.aggregate([
                { $match: { user: activity.user, date: { $gte: todayStart } } },
                { $group: { _id: null, total: { $sum: '$co2e' } } },
            ]);
            const todayCo2 = todayAgg[0]?.total ?? 0;

            if (todayCo2 >= threshold) {
                // Only create one threshold alert per day
                const alreadyAlerted = await EmissionAlert.findOne({
                    user: req.user.id, alertType: 'threshold_exceeded',
                    triggeredAt: { $gte: todayStart },
                });
                if (!alreadyAlerted) {
                    await EmissionAlert.create({
                        user: req.user.id,
                        alertType: 'threshold_exceeded',
                        title: '⚠️ Emission Threshold Exceeded',
                        message: `Your CO₂ today is ${todayCo2.toFixed(1)} kg, exceeding your ${threshold} kg daily limit. Consider eco-friendly alternatives!`,
                        icon: '🔴',
                    });
                }
            }

            // Badge alert
            if (newBadges.length > 0) {
                await EmissionAlert.create({
                    user: req.user.id,
                    alertType: 'badge_earned',
                    title: '🏆 New Badge Earned!',
                    message: `Congrats! You earned: ${newBadges.map(b => `${b.icon} ${b.name}`).join(', ')}`,
                    icon: '🏆',
                });
            }
        } catch (_) { /* alert errors should not block the main response */ }

        res.status(201).json({ success: true, data: activity, stats, newBadges, pointsEarned: points });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/activities ─────────────────────────────────────────────
exports.getActivities = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, category, days = 30 } = req.query;
        const since  = new Date(); since.setDate(since.getDate() - Number(days));
        const filter = { user: req.user.id, date: { $gte: since } };
        if (category) filter.category = category;

        const activities = await Activity.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Activity.countDocuments(filter);
        res.status(200).json({ success: true, data: activities, total, page: Number(page) });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/activities/summary ─────────────────────────────────────
exports.getSummary = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const now    = new Date();

        // Date ranges
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

        const [todayAgg, weekAgg, monthAgg, categoryAgg, stats] = await Promise.all([
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: todayStart } } },
                { $group: { _id: null, total: { $sum: '$co2e' }, count: { $sum: 1 } } },
            ]),
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: weekStart } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$co2e' } } },
                { $sort: { _id: 1 } },
            ]),
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: monthStart } } },
                { $group: { _id: '$category', total: { $sum: '$co2e' }, count: { $sum: 1 } } },
            ]),
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: monthStart } } },
                { $group: { _id: '$category', total: { $sum: '$co2e' } } },
            ]),
            UserStats.findOne({ user: userId }),
        ]);

        // Build 7-day chart data (fill gaps with 0)
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const found = weekAgg.find(x => x._id === key);
            last7.push({ date: key, label: d.toLocaleDateString('en', { weekday: 'short' }), co2e: found?.total ?? 0 });
        }

        res.status(200).json({
            success: true,
            today:   { co2e: todayAgg[0]?.total ?? 0, count: todayAgg[0]?.count ?? 0 },
            weekly:  last7,
            monthly: { breakdown: monthAgg, total: monthAgg.reduce((s, c) => s + c.total, 0) },
            stats,
        });
    } catch (err) {
        next(err);
    }
};

// ─── @route  DELETE /api/activities/:id ──────────────────────────────────────
exports.deleteActivity = async (req, res, next) => {
    try {
        const activity = await Activity.findOne({ _id: req.params.id, user: req.user.id });
        if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
        await activity.deleteOne();
        res.status(200).json({ success: true, message: 'Activity deleted' });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/activities/leaderboard ─────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
    try {
        const leaderboard = await UserStats.find()
            .sort({ ecoScore: -1, totalPoints: -1 })
            .limit(20)
            .populate('user', 'name avatar');

        res.status(200).json({ success: true, data: leaderboard });
    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/activities/emission-factors ────────────────────────────
exports.getEmissionFactors = async (req, res) => {
    res.status(200).json({ success: true, data: EF });
};

// ── Fallback suggestions (when no Gemini key) ─────────────────────────────────
const FALLBACK_SUGGESTIONS = [
    { icon: '🚶', title: 'Walk Short Trips', tip: 'Replace car trips under 3 km with walking or cycling to save ~0.6 kg CO₂ per trip.', category: 'transport', impact: 'high' },
    { icon: '🥗', title: 'Meatless Monday', tip: 'Replace one beef meal per week with a vegetarian option — saves ~5.6 kg CO₂/week.', category: 'food', impact: 'high' },
    { icon: '💡', title: 'Switch to LEDs', tip: 'LED bulbs use 75% less energy than incandescent lights and last 25x longer.', category: 'energy', impact: 'medium' },
    { icon: '♻️', title: 'Buy Second-hand', tip: 'Second-hand clothing saves ~80% of the CO₂ compared to manufacturing new items.', category: 'shopping', impact: 'medium' },
    { icon: '🌱', title: 'Offset Remaining CO₂', tip: 'Use the Carbon Offset feature to neutralize emissions you cannot yet eliminate.', category: 'general', impact: 'high' },
];

// ─── @route  GET /api/activities/suggestions ─────────────────────────────────
exports.getAISuggestions = async (req, res, next) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        // Collect user data for context
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const [stats, categoryAgg, recent] = await Promise.all([
            UserStats.findOne({ user: req.user.id }),
            Activity.aggregate([
                { $match: { user: req.user.id, date: { $gte: monthStart } } },
                { $group: { _id: '$category', total: { $sum: '$co2e' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ]),
            Activity.find({ user: req.user.id }).sort({ date: -1 }).limit(10).select('label co2e category subType'),
        ]);

        if (!apiKey || apiKey === 'your_groq_api_key_here') {
            return res.status(200).json({ success: true, suggestions: FALLBACK_SUGGESTIONS, ai: false });
        }

        const Groq  = require('groq-sdk');
        const groq  = new Groq({ apiKey });

        const dataContext = [
            `Monthly CO₂ by category: ${categoryAgg.map(c => `${c._id} ${c.total.toFixed(1)} kg`).join(', ') || 'no data yet'}`,
            `Total monthly: ${(stats?.monthlyEmissions ?? 0).toFixed(1)} kg. Eco score: ${stats?.ecoScore ?? 50}/100`,
            `Recent activities: ${recent.map(a => `${a.label} ${a.co2e.toFixed(1)} kg`).join(', ') || 'none yet'}`,
        ].join('. ');

        const prompt = `Based on this user's carbon footprint data, generate exactly 5 specific, actionable, personalized eco-friendly suggestions.

User data: ${dataContext}

Return ONLY a valid JSON array with exactly 5 objects, no markdown, no explanation. Each object must have:
- "icon": single emoji
- "title": short title (3-5 words)
- "tip": specific advice with a CO₂ saving estimate (1-2 sentences)
- "category": transport/food/energy/shopping/general
- "impact": high/medium/low`;

        const completion = await groq.chat.completions.create({
            model:       'llama-3.1-8b-instant',
            messages:    [
                { role: 'system', content: 'You are an eco-coach AI. Always respond with valid JSON only — no markdown, no code blocks, no extra text.' },
                { role: 'user',   content: prompt },
            ],
            max_tokens:  800,
            temperature: 0.5,
        });

        let text = (completion.choices[0]?.message?.content ?? '').trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let suggestions;
        try {
            suggestions = JSON.parse(text);
            if (!Array.isArray(suggestions)) throw new Error('Not array');
            suggestions = suggestions.slice(0, 5);
        } catch {
            suggestions = FALLBACK_SUGGESTIONS;
        }

        res.status(200).json({ success: true, suggestions, ai: true });
    } catch (err) {
        // On any error, return fallback suggestions
        res.status(200).json({ success: true, suggestions: FALLBACK_SUGGESTIONS, ai: false });
    }
};
