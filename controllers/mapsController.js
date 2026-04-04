// ─── Local City Coordinates Database ─────────────────────────────────────────
// No Google billing required — works 100% offline using Haversine formula
const CITIES = {
  // ── Pakistan ──────────────────────────────────────────────────────────────
  'karachi':          { lat: 24.8607,  lng: 67.0011,  name: 'Karachi, Pakistan' },
  'lahore':           { lat: 31.5204,  lng: 74.3587,  name: 'Lahore, Pakistan' },
  'islamabad':        { lat: 33.6844,  lng: 73.0479,  name: 'Islamabad, Pakistan' },
  'rawalpindi':       { lat: 33.5651,  lng: 73.0169,  name: 'Rawalpindi, Pakistan' },
  'faisalabad':       { lat: 31.4504,  lng: 73.1350,  name: 'Faisalabad, Pakistan' },
  'multan':           { lat: 30.1575,  lng: 71.5249,  name: 'Multan, Pakistan' },
  'peshawar':         { lat: 34.0151,  lng: 71.5805,  name: 'Peshawar, Pakistan' },
  'quetta':           { lat: 30.1798,  lng: 66.9750,  name: 'Quetta, Pakistan' },
  'sialkot':          { lat: 32.4945,  lng: 74.5229,  name: 'Sialkot, Pakistan' },
  'gujranwala':       { lat: 32.1877,  lng: 74.1945,  name: 'Gujranwala, Pakistan' },
  'hyderabad':        { lat: 25.3960,  lng: 68.3578,  name: 'Hyderabad, Pakistan' },
  'bahawalpur':       { lat: 29.3956,  lng: 71.6836,  name: 'Bahawalpur, Pakistan' },
  'sargodha':         { lat: 32.0836,  lng: 72.6711,  name: 'Sargodha, Pakistan' },
  'sukkur':           { lat: 27.7052,  lng: 68.8574,  name: 'Sukkur, Pakistan' },
  'larkana':          { lat: 27.5570,  lng: 68.2247,  name: 'Larkana, Pakistan' },
  'sheikhupura':      { lat: 31.7167,  lng: 73.9850,  name: 'Sheikhupura, Pakistan' },
  'rahim yar khan':   { lat: 28.4202,  lng: 70.2952,  name: 'Rahim Yar Khan, Pakistan' },
  'jhang':            { lat: 31.2681,  lng: 72.3181,  name: 'Jhang, Pakistan' },
  'abbottabad':       { lat: 34.1558,  lng: 73.2194,  name: 'Abbottabad, Pakistan' },
  'nawabshah':        { lat: 26.2442,  lng: 68.4100,  name: 'Nawabshah, Pakistan' },
  'okara':            { lat: 30.8138,  lng: 73.4534,  name: 'Okara, Pakistan' },
  'mirpur khas':      { lat: 25.5270,  lng: 69.0133,  name: 'Mirpur Khas, Pakistan' },
  'chiniot':          { lat: 31.7167,  lng: 72.9833,  name: 'Chiniot, Pakistan' },
  'kamoke':           { lat: 31.9736,  lng: 74.2244,  name: 'Kamoke, Pakistan' },
  'mandi bahauddin':  { lat: 32.5864,  lng: 73.4917,  name: 'Mandi Bahauddin, Pakistan' },
  'jhelum':           { lat: 32.9425,  lng: 73.7257,  name: 'Jhelum, Pakistan' },
  'sadiqabad':        { lat: 28.3092,  lng: 70.1307,  name: 'Sadiqabad, Pakistan' },
  'khanewal':         { lat: 30.3015,  lng: 71.9322,  name: 'Khanewal, Pakistan' },
  'hafizabad':        { lat: 32.0709,  lng: 73.6883,  name: 'Hafizabad, Pakistan' },
  'kohat':            { lat: 33.5886,  lng: 71.4424,  name: 'Kohat, Pakistan' },
  'muzaffarabad':     { lat: 34.3700,  lng: 73.4700,  name: 'Muzaffarabad, Pakistan' },
  'gilgit':           { lat: 35.9220,  lng: 74.3083,  name: 'Gilgit, Pakistan' },
  'turbat':           { lat: 25.9895,  lng: 63.0624,  name: 'Turbat, Pakistan' },
  'mardan':           { lat: 34.1986,  lng: 72.0404,  name: 'Mardan, Pakistan' },
  'mingora':          { lat: 34.7717,  lng: 72.3600,  name: 'Mingora, Pakistan' },
  'nawabshah':        { lat: 26.2442,  lng: 68.4100,  name: 'Nawabshah, Pakistan' },

  // ── India ─────────────────────────────────────────────────────────────────
  'mumbai':           { lat: 19.0760,  lng: 72.8777,  name: 'Mumbai, India' },
  'delhi':            { lat: 28.7041,  lng: 77.1025,  name: 'New Delhi, India' },
  'new delhi':        { lat: 28.6139,  lng: 77.2090,  name: 'New Delhi, India' },
  'bangalore':        { lat: 12.9716,  lng: 77.5946,  name: 'Bangalore, India' },
  'kolkata':          { lat: 22.5726,  lng: 88.3639,  name: 'Kolkata, India' },
  'chennai':          { lat: 13.0827,  lng: 80.2707,  name: 'Chennai, India' },
  'amritsar':         { lat: 31.6340,  lng: 74.8723,  name: 'Amritsar, India' },
  'hyderabad india':  { lat: 17.3850,  lng: 78.4867,  name: 'Hyderabad, India' },

  // ── UAE ───────────────────────────────────────────────────────────────────
  'dubai':            { lat: 25.2048,  lng: 55.2708,  name: 'Dubai, UAE' },
  'abu dhabi':        { lat: 24.4539,  lng: 54.3773,  name: 'Abu Dhabi, UAE' },
  'sharjah':          { lat: 25.3462,  lng: 55.4211,  name: 'Sharjah, UAE' },

  // ── Saudi Arabia ──────────────────────────────────────────────────────────
  'riyadh':           { lat: 24.7136,  lng: 46.6753,  name: 'Riyadh, Saudi Arabia' },
  'jeddah':           { lat: 21.4858,  lng: 39.1925,  name: 'Jeddah, Saudi Arabia' },
  'mecca':            { lat: 21.3891,  lng: 39.8579,  name: 'Mecca, Saudi Arabia' },
  'medina':           { lat: 24.5247,  lng: 39.5692,  name: 'Medina, Saudi Arabia' },

  // ── UK ────────────────────────────────────────────────────────────────────
  'london':           { lat: 51.5074,  lng: -0.1278,  name: 'London, UK' },
  'manchester':       { lat: 53.4808,  lng: -2.2426,  name: 'Manchester, UK' },
  'birmingham':       { lat: 52.4862,  lng: -1.8904,  name: 'Birmingham, UK' },

  // ── USA ───────────────────────────────────────────────────────────────────
  'new york':         { lat: 40.7128,  lng: -74.0060, name: 'New York, USA' },
  'los angeles':      { lat: 34.0522,  lng: -118.2437,name: 'Los Angeles, USA' },
  'chicago':          { lat: 41.8781,  lng: -87.6298, name: 'Chicago, USA' },
  'houston':          { lat: 29.7604,  lng: -95.3698, name: 'Houston, USA' },
  'washington':       { lat: 38.9072,  lng: -77.0369, name: 'Washington DC, USA' },

  // ── Europe ────────────────────────────────────────────────────────────────
  'paris':            { lat: 48.8566,  lng: 2.3522,   name: 'Paris, France' },
  'berlin':           { lat: 52.5200,  lng: 13.4050,  name: 'Berlin, Germany' },
  'madrid':           { lat: 40.4168,  lng: -3.7038,  name: 'Madrid, Spain' },
  'rome':             { lat: 41.9028,  lng: 12.4964,  name: 'Rome, Italy' },
  'amsterdam':        { lat: 52.3676,  lng: 4.9041,   name: 'Amsterdam, Netherlands' },
  'toronto':          { lat: 43.6532,  lng: -79.3832, name: 'Toronto, Canada' },

  // ── Asia ──────────────────────────────────────────────────────────────────
  'beijing':          { lat: 39.9042,  lng: 116.4074, name: 'Beijing, China' },
  'shanghai':         { lat: 31.2304,  lng: 121.4737, name: 'Shanghai, China' },
  'tokyo':            { lat: 35.6762,  lng: 139.6503, name: 'Tokyo, Japan' },
  'singapore':        { lat: 1.3521,   lng: 103.8198, name: 'Singapore' },
  'bangkok':          { lat: 13.7563,  lng: 100.5018, name: 'Bangkok, Thailand' },
  'kuala lumpur':     { lat: 3.1390,   lng: 101.6869, name: 'Kuala Lumpur, Malaysia' },
  'jakarta':          { lat: -6.2088,  lng: 106.8456, name: 'Jakarta, Indonesia' },
  'dhaka':            { lat: 23.8103,  lng: 90.4125,  name: 'Dhaka, Bangladesh' },
  'kabul':            { lat: 34.5553,  lng: 69.2075,  name: 'Kabul, Afghanistan' },
  'tehran':           { lat: 35.6892,  lng: 51.3890,  name: 'Tehran, Iran' },
  'istanbul':         { lat: 41.0082,  lng: 28.9784,  name: 'Istanbul, Turkey' },
  'doha':             { lat: 25.2854,  lng: 51.5310,  name: 'Doha, Qatar' },
  'kuwait city':      { lat: 29.3759,  lng: 47.9774,  name: 'Kuwait City, Kuwait' },
  'muscat':           { lat: 23.5880,  lng: 58.3829,  name: 'Muscat, Oman' },
};

// ── Haversine formula ─────────────────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2
               + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
               * Math.sin(dLng / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

// ── Find best matching city from input string ─────────────────────────────────
const findCity = (input) => {
    const q = input.toLowerCase().trim();

    // Exact match first
    if (CITIES[q]) return CITIES[q];

    // Partial match — city key is contained in input
    for (const [key, val] of Object.entries(CITIES)) {
        if (q.includes(key) || key.includes(q)) return val;
    }

    // Word-level match — any word in input matches any word in key
    const words = q.split(/[\s,]+/).filter(w => w.length > 2);
    for (const word of words) {
        for (const [key, val] of Object.entries(CITIES)) {
            if (key.includes(word) || word.includes(key.split(' ')[0])) return val;
        }
    }

    return null;
};

// ─── @route  POST /api/maps/distance ─────────────────────────────────────────
exports.getDistance = async (req, res, next) => {
    try {
        const { origin, destination, subType } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ success: false, error: 'Origin and destination are required' });
        }

        const city1 = findCity(origin);
        const city2 = findCity(destination);

        if (!city1) {
            return res.status(400).json({
                success: false,
                error: `City not found: "${origin}". Try a major city name like "Lahore" or "Karachi".`,
            });
        }
        if (!city2) {
            return res.status(400).json({
                success: false,
                error: `City not found: "${destination}". Try a major city name like "Lahore" or "Karachi".`,
            });
        }

        const isFlightMode = ['flight_domestic', 'flight_international'].includes(subType);
        const straightLine = haversineKm(city1.lat, city1.lng, city2.lat, city2.lng);

        // Road distance ≈ straight-line × 1.3  |  Flight = straight-line
        const distanceKm  = isFlightMode
            ? straightLine
            : parseFloat((straightLine * 1.3).toFixed(1));

        // Rough duration estimate
        const speedKmH    = isFlightMode ? 800 : 60;
        const durationMin = Math.round((distanceKm / speedKmH) * 60);
        const durationTxt = durationMin >= 60
            ? `~${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
            : `~${durationMin}m`;

        res.status(200).json({
            success:      true,
            distanceKm,
            durationMin,
            distanceText: `${distanceKm} km`,
            durationText: durationTxt,
            origin:       city1.name,
            destination:  city2.name,
            method:       'local_haversine',
            note:         isFlightMode
                ? 'Straight-line flight distance'
                : 'Estimated road distance (straight-line × 1.3)',
        });

    } catch (err) {
        next(err);
    }
};

// ─── @route  GET /api/maps/nearby ────────────────────────────────────────────
exports.nearbyPlaces = async (req, res) => {
    // Google Places API requires billing — return empty with helpful message
    res.status(200).json({
        success:  true,
        places:   [],
        fallback: true,
        message:  'Nearby places requires Google Maps billing. Enable billing at console.cloud.google.com to use this feature.',
    });
};

// ─── @route  GET /api/maps/autocomplete ──────────────────────────────────────
exports.autocomplete = async (req, res) => {
    const { input } = req.query;
    if (!input || input.length < 2) {
        return res.status(200).json({ success: true, predictions: [] });
    }

    const q = input.toLowerCase().trim();
    const matches = Object.entries(CITIES)
        .filter(([key]) => key.includes(q) || q.includes(key.split(' ')[0]))
        .slice(0, 6)
        .map(([, val]) => ({ description: val.name }));

    res.status(200).json({ success: true, predictions: matches });
};
