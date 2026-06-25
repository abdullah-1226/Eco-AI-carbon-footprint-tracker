const Activity      = require('../models/Activity');
const UserStats     = require('../models/UserStats');
const EmissionAlert = require('../models/EmissionAlert');
const User          = require('../models/User');

// ─── Emission Factors (kg CO₂ per unit) ──────────────────────────────────────
const EF = {
    transport: {
        car_petrol:           { factor: 0.21,  unit: 'km',   label: 'Car (Petrol)' },
        car_diesel:           { factor: 0.17,  unit: 'km',   label: 'Car (Diesel)' },
        car_electric:         { factor: 0.05,  unit: 'km',   label: 'Car (Electric)' },
        car_hybrid:           { factor: 0.11,  unit: 'km',   label: 'Car (Hybrid)' },
        car_suv_petrol:       { factor: 0.28,  unit: 'km',   label: 'Car SUV (Petrol)' },
        car_suv_diesel:       { factor: 0.22,  unit: 'km',   label: 'Car SUV (Diesel)' },
        car_van:              { factor: 0.20,  unit: 'km',   label: 'Van / Minibus' },
        motorcycle:           { factor: 0.114, unit: 'km',   label: 'Motorcycle' },
        bus:                  { factor: 0.089, unit: 'km',   label: 'Bus' },
        train:                { factor: 0.041, unit: 'km',   label: 'Train' },
        flight_domestic:      { factor: 0.255, unit: 'km',   label: 'Flight (Domestic)' },
        flight_international: { factor: 0.195, unit: 'km',   label: 'Flight (International)' },
        bicycle:              { factor: 0,     unit: 'km',   label: 'Bicycle' },
        walking:              { factor: 0,     unit: 'km',   label: 'Walking' },
    },
    food: {
        beef_meal:       { factor: 6.61, unit: 'meal', label: 'Beef Meal' },
        lamb_meal:       { factor: 5.84, unit: 'meal', label: 'Lamb/Mutton Meal' },
        pork_meal:       { factor: 2.45, unit: 'meal', label: 'Pork Meal' },
        chicken_meal:    { factor: 1.24, unit: 'meal', label: 'Chicken Meal' },
        fish_meal:       { factor: 1.51, unit: 'meal', label: 'Fish Meal' },
        dairy_meal:      { factor: 1.35, unit: 'meal', label: 'Dairy (Milk/Cheese)' },
        vegetables_meal: { factor: 0.35, unit: 'meal', label: 'Fresh Vegetables' },
        processed_food:  { factor: 2.85, unit: 'meal', label: 'Processed Food' },
        vegetarian:      { factor: 0.94, unit: 'meal', label: 'Vegetarian Meal' },
        vegan:           { factor: 0.70, unit: 'meal', label: 'Vegan Meal' },
    },
    energy: {
        electricity:  { factor: 0.233, unit: 'kWh', label: 'Electricity (Grid)' },
        natural_gas:  { factor: 0.202, unit: 'kWh', label: 'Natural Gas' },
        solar_energy: { factor: 0.02,  unit: 'kWh', label: 'Solar Energy' },
        lpg_gas:      { factor: 0.215, unit: 'kWh', label: 'LPG / Cooking Gas' },
        coal_heating: { factor: 0.341, unit: 'kWh', label: 'Coal Heating' },
    },
    shopping: {
        // Legacy generic keys
        clothing:           { factor: 25,  unit: 'item', label: 'Clothing' },
        furniture:          { factor: 120, unit: 'item', label: 'Furniture' },
        grocery_bag:        { factor: 5,   unit: 'bag',  label: 'Grocery Bag' },

        // Men's clothing
        mens_tshirt:        { factor: 5,   unit: 'item', label: "Men's T-Shirt / Polo" },
        mens_shirt:         { factor: 8,   unit: 'item', label: "Men's Shirt / Formal" },
        mens_pants:         { factor: 33,  unit: 'item', label: "Men's Jeans / Trousers" },
        mens_jacket:        { factor: 25,  unit: 'item', label: "Men's Jacket / Hoodie" },
        mens_shoes:         { factor: 18,  unit: 'item', label: "Men's Shoes / Sneakers" },

        // Women's clothing
        womens_top:         { factor: 4.5, unit: 'item', label: "Women's T-Shirt / Blouse" },
        womens_dress:       { factor: 22,  unit: 'item', label: 'Dress / Skirt' },
        womens_pants:       { factor: 28,  unit: 'item', label: "Women's Jeans / Trousers" },
        womens_coat:        { factor: 50,  unit: 'item', label: "Women's Coat / Jacket" },
        womens_shoes:       { factor: 16,  unit: 'item', label: "Women's Shoes / Heels" },

        // Kids' & Other
        kids_clothing:      { factor: 3,   unit: 'item', label: "Kids' Clothing" },
        underwear_socks:    { factor: 2.5, unit: 'item', label: 'Underwear / Socks' },
        accessories:        { factor: 10,  unit: 'item', label: 'Bag / Belt / Scarf' },

        // Electronics
        electronics_small:  { factor: 70,  unit: 'item', label: 'Phone / Tablet' },
        electronics_large:  { factor: 300, unit: 'item', label: 'Laptop / TV / PC' },

        // Furniture
        furniture_sofa:     { factor: 150, unit: 'item', label: 'Sofa / Couch' },
        furniture_bed:      { factor: 120, unit: 'item', label: 'Bed / Mattress' },
        furniture_table:    { factor: 200, unit: 'item', label: 'Table & Chairs' },
        furniture_wardrobe: { factor: 100, unit: 'item', label: 'Wardrobe / Cabinet' },
        furniture_shelf:    { factor: 50,  unit: 'item', label: 'Shelf / Bookcase' },
        furniture_desk:     { factor: 80,  unit: 'item', label: 'Desk / Office Chair' },
    },
    custom: {
        custom_activity: { factor: 1.0, unit: 'kg CO₂', label: 'Custom Activity' },
    },
};

// Badges definition
const BADGES = [
    { id: 'first_log',      name: 'First Step',      icon: '🌱', description: 'Logged your first activity'             },
    { id: 'eco_walker',     name: 'Eco Walker',       icon: '🚶', description: '10+ walking/cycling activities'         },
    { id: 'green_diet',     name: 'Green Plate',      icon: '🥗', description: '10+ vegan/vegetarian meals'             },
    { id: 'streak_7',       name: '7-Day Streak',     icon: '🔥', description: 'Logged activities 7 days in a row'      },
    { id: 'streak_30',      name: '30-Day Streak',    icon: '⚡', description: 'Logged activities 30 days in a row'     },
    { id: 'century',        name: 'Century Logger',   icon: '💯', description: 'Logged 100 activities'                  },
    { id: 'low_carbon_day', name: 'Low Carbon Day',   icon: '🌍', description: 'Kept daily emissions under 5 kg CO₂'   },
    { id: 'energy_saver',   name: 'Energy Saver',     icon: '💡', description: 'Logged 20+ energy-saving activities'    },
    { id: 'offset_50',      name: 'Offset Hero',      icon: '🌿', description: 'Offset 50 kg CO₂'                      },
    { id: 'offset_100',     name: 'Carbon Slayer',    icon: '⚔️', description: 'Offset 100 kg CO₂'                     },
    { id: 'plant_meals_30', name: 'Plant Power',      icon: '🥦', description: '30 plant-based meals logged'            },
    { id: 'low_month',      name: 'Eco Month',        icon: '🗓️', description: 'Monthly emissions under 100 kg CO₂'   },
    { id: 'activities_50',  name: 'Half Century',     icon: '🎯', description: 'Logged 50 activities'                   },
    { id: 'points_1000',    name: 'Eco Achiever',     icon: '🏅', description: 'Earned 1,000 eco points'               },
    { id: 'points_10000',   name: 'Eco Legend',       icon: '🏆', description: 'Earned 10,000 eco points'              },
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

    if (!hasBadge('activities_50') && stats.totalActivities >= 50)
        newBadges.push(BADGES.find(b => b.id === 'activities_50'));

    if (!hasBadge('points_1000') && stats.totalPoints >= 1000)
        newBadges.push(BADGES.find(b => b.id === 'points_1000'));

    if (!hasBadge('points_10000') && stats.totalPoints >= 10000)
        newBadges.push(BADGES.find(b => b.id === 'points_10000'));

    if (!hasBadge('low_month') && stats.monthlyEmissions > 0 && stats.monthlyEmissions < 100)
        newBadges.push(BADGES.find(b => b.id === 'low_month'));

    const ecoTransport = allActivities.filter(a =>
        a.category === 'transport' && ['bicycle', 'walking'].includes(a.subType)).length;
    if (!hasBadge('eco_walker') && ecoTransport >= 10)
        newBadges.push(BADGES.find(b => b.id === 'eco_walker'));

    const greenMeals = allActivities.filter(a =>
        a.category === 'food' && ['vegan', 'vegetarian'].includes(a.subType)).length;
    if (!hasBadge('green_diet') && greenMeals >= 10)
        newBadges.push(BADGES.find(b => b.id === 'green_diet'));

    if (!hasBadge('plant_meals_30') && greenMeals >= 30)
        newBadges.push(BADGES.find(b => b.id === 'plant_meals_30'));

    newBadges.forEach(badge => { if (badge) stats.badges.push(badge); });
    return newBadges;
};

// ─── @route  POST /api/activities ────────────────────────────────────────────
exports.logActivity = async (req, res, next) => {
    try {
        const { category, subType, value, note, date, customLabel, customEF } = req.body;

        if (!category || !subType || value == null) {
            return res.status(400).json({ success: false, error: 'category, subType, and value are required' });
        }

        let co2e, activityLabel, activityUnit;

        if (category === 'custom') {
            co2e          = parseFloat(value) || 0;
            activityLabel = customLabel || note || 'Custom Activity';
            activityUnit  = 'kg CO₂';
        } else {
            const ef = EF[category]?.[subType];
            if (!ef) return res.status(400).json({ success: false, error: 'Invalid category or subType' });
            // customEF sent from frontend when a scenario (carpool, cooking method, etc.) adjusts the factor
            const factor = (customEF != null && !isNaN(parseFloat(customEF)))
                ? parseFloat(customEF)
                : ef.factor;
            co2e          = parseFloat((factor * parseFloat(value)).toFixed(3));
            activityLabel = ef.label;
            activityUnit  = ef.unit;
        }

        const activity = await Activity.create({
            user: req.user.id,
            category, subType,
            label: activityLabel,
            value, unit: activityUnit,
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
        const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
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

            const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
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
        const userId = req.user._id; // must be ObjectId — aggregation pipeline doesn't auto-cast strings
        const now    = new Date();

        // Date ranges — all UTC to match MongoDB's $dateToString default (UTC)
        const todayStart     = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
        const weekStart      = new Date(todayStart); weekStart.setUTCDate(weekStart.getUTCDate() - 6);
        const monthStart     = new Date(todayStart); monthStart.setUTCDate(1);
        const thirtyDaysAgo  = new Date(todayStart); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

        const [todayAgg, weekAgg, monthAgg, categoryAgg, yesterdayAgg, stats, daily30Agg, weeklyAgg] = await Promise.all([
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
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: yesterdayStart, $lt: todayStart } } },
                { $group: { _id: '$category', total: { $sum: '$co2e' } } },
            ]),
            UserStats.findOne({ user: userId }),
            // last 30 days — one entry per day
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: thirtyDaysAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$co2e' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // last 30 days — one entry per ISO week
            Activity.aggregate([
                { $match: { user: userId, date: { $gte: thirtyDaysAgo } } },
                { $group: {
                    _id:       { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } },
                    total:     { $sum: '$co2e' },
                    count:     { $sum: 1 },
                    weekStart: { $min: '$date' },
                }},
                { $sort: { '_id.year': 1, '_id.week': 1 } },
            ]),
        ]);

        // Build 7-day chart data (fill gaps with 0) — keys in UTC to match weekAgg grouping
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayStart); d.setUTCDate(d.getUTCDate() - i);
            const key = d.toISOString().slice(0, 10);
            const found = weekAgg.find(x => x._id === key);
            last7.push({ date: key, label: d.toLocaleDateString('en', { weekday: 'short' }), co2e: found?.total ?? 0 });
        }

        // Build 30-day daily array (fill gaps with 0)
        const daily30 = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(todayStart); d.setUTCDate(d.getUTCDate() - i);
            const key   = d.toISOString().slice(0, 10);
            const found = daily30Agg.find(x => x._id === key);
            daily30.push({
                date:     key,
                label:    d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                dayLabel: d.toLocaleDateString('en', { weekday: 'short' }),
                co2e:     found?.total ?? 0,
                count:    found?.count ?? 0,
            });
        }

        // Build per-week array (last ~4-5 weeks)
        const weekly4 = weeklyAgg.map(w => ({
            label:     `Wk ${w._id.week}`,
            weekStart: new Date(w.weekStart).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            co2e:      parseFloat(w.total.toFixed(2)),
            count:     w.count,
        }));

        // Yesterday per-category map
        const yesterdayByCategory = Object.fromEntries(yesterdayAgg.map(y => [y._id, y.total]));

        res.status(200).json({
            success:   true,
            today:     { co2e: todayAgg[0]?.total ?? 0, count: todayAgg[0]?.count ?? 0 },
            weekly:    last7,
            monthly:   { breakdown: monthAgg, total: monthAgg.reduce((s, c) => s + c.total, 0) },
            yesterday: yesterdayByCategory,
            stats,
            daily30,
            weekly4,
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

// ─── @route  POST /api/activities/analyze-scenario ───────────────────────────
// Accepts a free-text scenario description and returns an AI-derived CO₂ multiplier.
exports.analyzeScenario = async (req, res, next) => {
    try {
        const { description, category, subType, baseEF, unit, isFood } = req.body;

        if (!description?.trim()) {
            return res.status(400).json({ success: false, error: 'Description is required.' });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === 'your_groq_api_key_here') {
            // Fallback: simple keyword parse
            return res.json(simpleParse(description, baseEF, unit));
        }

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey });

        const prompt = `You are an expert carbon footprint calculator with deep knowledge of Pakistan geography and global emission factors.

User is logging a ${category} activity.
Activity subtype: ${subType}
Base emission factor: ${baseEF} kg CO₂ per ${unit}
User description: "${description}"

KNOWN PAKISTAN ROAD DISTANCES (km):
Lahore-Karachi=1250, Lahore-Islamabad=380, Lahore-Peshawar=490, Lahore-Multan=350, Lahore-Faisalabad=160, Lahore-Sialkot=125, Lahore-Gujranwala=70, Lahore-Rawalpindi=370, Karachi-Islamabad=1625, Karachi-Multan=900, Karachi-Hyderabad=165, Islamabad-Peshawar=170, Islamabad-Multan=420, Multan-Faisalabad=195

MULTIPLIER RULES:
TRANSPORT:
- Solo driver in own car = ×1.0
- Taxi/Uber/Careem/Cab = ×0.67 (average 1.5 occupants share emissions)
- Carpool: 2 people total=×0.5, 3=×0.333, 4=×0.25, 5=×0.2
- AC on = ×1.15 | Highway = ×0.9 | Heavy city traffic = ×1.2
- Bus/coach = ×0.089 per km (use this EF directly, set multiplier accordingly)
- For round trips mentioned: add both legs together for suggestedValue
- Combine all applicable factors by multiplying

FOOD: small/light portion=×0.6, large/heavy=×1.5, organic/local=×0.7, imported=×1.2, leftover=×0.3, vegan=×0.4
SHOPPING: second-hand/thrift=×0.1, eco/sustainable brand=×0.55, premium/luxury=×1.3, repaired=×0.15
ENERGY: solar/renewable=×0.05, efficient/LED=×0.6, old/inefficient=×1.4, eco-mode=×0.5

CRITICAL — suggestedValue meaning by category:
- TRANSPORT: suggestedValue = total distance in KM (e.g. Lahore→Karachi round trip = 2500)
- FOOD: suggestedValue = weight of food in KG mentioned by user (e.g. "5 kg mutton" → 5, "500g chicken" → 0.5). NEVER put CO₂ here.
- ENERGY: suggestedValue = kWh consumed if mentioned, else null
- SHOPPING: suggestedValue = number of items if mentioned, else null

RESPONSE FORMAT — return ONLY this JSON, no extra text:
{
  "multiplier": <combined decimal factor, 0.05–3.0>,
  "suggestedValue": <see above rules — the QUANTITY not the CO₂ amount>,
  "explanation": "<one clear sentence summarising the full calculation>",
  "breakdown": ["<factor 1 with numbers>", "<factor 2 with numbers>", "<total CO₂ estimate>"]
}

Example — TRANSPORT "Lahore to Karachi solo then back by taxi":
{"multiplier":0.835,"suggestedValue":2500,"explanation":"Lahore→Karachi 1250km solo (×1.0) + return 1250km taxi (×0.67) = 2500km total, weighted ×0.835.","breakdown":["Outbound: 1250km solo ×1.0 = 262.5 kg","Return: 1250km taxi ×0.67 = 176kg","Total 2500km, avg ×0.835"]}

Example — FOOD "i use 5 kg mutton, 2.5 kg bbq and 2.5 kg deep fried":
{"multiplier":1.3,"suggestedValue":5,"explanation":"5 kg mutton total: half BBQ (×1.2) and half deep fried (×1.4), average ×1.3 cooking multiplier.","breakdown":["2.5 kg BBQ ×1.2","2.5 kg deep fried ×1.4","Average multiplier: ×1.3 on 5 kg total"]}`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are a carbon footprint calculator. Always respond with valid JSON only. No markdown, no explanation outside JSON.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: 350,
            temperature: 0.1,
        });

        const raw  = completion.choices[0]?.message?.content ?? '';
        const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}');

        const mult           = Math.min(3.0, Math.max(0.05, parseFloat(json.multiplier) || 1.0));
        const suggestedValue = json.suggestedValue ? parseFloat(json.suggestedValue) : null;
        res.json({
            success:        true,
            multiplier:     mult,
            estimatedEF:    parseFloat((baseEF * mult).toFixed(4)),
            suggestedValue: suggestedValue && suggestedValue > 0 ? suggestedValue : null,
            explanation:    json.explanation || 'Calculated from your description.',
            breakdown:      Array.isArray(json.breakdown) ? json.breakdown : [],
        });
    } catch (err) {
        // If AI fails, fall back to simple keyword parsing
        try {
            const { description, baseEF, unit } = req.body;
            return res.json(simpleParse(description, baseEF, unit));
        } catch (_) { next(err); }
    }
};

const PK_ROAD_KM = {
    'lahore-karachi':1250,'karachi-lahore':1250,'lahore-islamabad':380,'islamabad-lahore':380,
    'lahore-peshawar':490,'peshawar-lahore':490,'lahore-multan':350,'multan-lahore':350,
    'lahore-faisalabad':160,'faisalabad-lahore':160,'lahore-sialkot':125,'sialkot-lahore':125,
    'lahore-gujranwala':70,'gujranwala-lahore':70,'lahore-rawalpindi':370,'rawalpindi-lahore':370,
    'karachi-islamabad':1625,'islamabad-karachi':1625,'karachi-multan':900,'multan-karachi':900,
    'karachi-hyderabad':165,'hyderabad-karachi':165,'islamabad-peshawar':170,'peshawar-islamabad':170,
    'islamabad-multan':420,'multan-islamabad':420,'multan-faisalabad':195,'faisalabad-multan':195,
    'rawalpindi-islamabad':15,'islamabad-rawalpindi':15,'lahore-bahawalpur':480,'bahawalpur-lahore':480,
};
function simpleParse(description = '', baseEF = 0, unit = 'km') {
    const text = description.toLowerCase();
    let mult = 1.0;
    let suggestedValue = null;
    const breakdown = [];

    // Explicit km/km distance in description
    const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometre|miles?)/);
    if (kmMatch) {
        const val = parseFloat(kmMatch[1]);
        suggestedValue = kmMatch[0].includes('mile') ? Math.round(val * 1.609) : val;
        breakdown.push(`Distance: ${suggestedValue} km from description`);
    }

    // City pair distance lookup (e.g. "lahore to karachi", "lahore → karachi")
    if (!suggestedValue) {
        const cityMatch = text.match(/([a-z\s]+?)\s+(?:to|→|->|–)\s+([a-z\s]+)/);
        if (cityMatch) {
            const c1 = cityMatch[1].trim().replace(/\s+/g,' ');
            const c2 = cityMatch[2].trim().split(/\s+/).slice(0,3).join(' ').replace(/\s+/g,' ');
            const key = `${c1}-${c2}`;
            if (PK_ROAD_KM[key]) {
                suggestedValue = PK_ROAD_KM[key];
                breakdown.push(`${c1}→${c2}: ${suggestedValue} km`);
            }
        }
    }

    // Hours of driving → estimate distance (avg 80 km/h)
    if (!suggestedValue) {
        const hrMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/);
        if (hrMatch) {
            suggestedValue = Math.round(parseFloat(hrMatch[1]) * 80);
            breakdown.push(`~${suggestedValue} km estimated from ${hrMatch[1]}h drive`);
        }
    }

    // Passengers
    const paxMatch = text.match(/(\d+)\s*(people|passengers?|persons?|pax|ppl)/);
    if (paxMatch) {
        const n = parseInt(paxMatch[1]);
        if (n > 1) { mult *= 1 / n; breakdown.push(`÷${n} passengers = ${(1/n).toFixed(3)}`); }
    }
    // AC
    if (/\bac\b|air.?con|aircond/.test(text)) { mult *= 1.15; breakdown.push('×1.15 AC on'); }
    // Highway
    if (/highway|motorway|freeway|express/.test(text)) { mult *= 0.9; breakdown.push('×0.9 highway'); }
    // City / traffic
    if (/city|traffic|jam|urban|stop.?go/.test(text)) { mult *= 1.2; breakdown.push('×1.2 city traffic'); }

    mult = Math.min(3.0, Math.max(0.05, mult));
    return {
        success:        true,
        multiplier:     parseFloat(mult.toFixed(4)),
        estimatedEF:    parseFloat((baseEF * mult).toFixed(4)),
        suggestedValue: suggestedValue && suggestedValue > 0 ? suggestedValue : null,
        explanation:    breakdown.length ? `Applied: ${breakdown.join(', ')}.` : 'No specific factors detected — using base rate.',
        breakdown,
    };
}

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
        const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
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
