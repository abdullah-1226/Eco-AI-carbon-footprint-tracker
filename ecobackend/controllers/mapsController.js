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

// ── Pakistan local areas database ─────────────────────────────────────────────
// Covers housing societies OSM doesn't have (Edenabad, Fazia, Bahria, etc.)
const PK_AREAS = [
  // ── Lahore ──────────────────────────────────────────────────────────────────
  { n:'Edenabad',                    c:'Lahore', lat:31.4067, lng:74.1917 },
  { n:'Edenabad Block A',            c:'Lahore', lat:31.4060, lng:74.1910 },
  { n:'Edenabad Block B',            c:'Lahore', lat:31.4070, lng:74.1925 },
  { n:'Fazia Housing Scheme',        c:'Lahore', lat:31.4700, lng:74.3200 },
  { n:'Fazaia Housing Scheme',       c:'Lahore', lat:31.5170, lng:74.3650 },
  { n:'DHA Phase 1',                 c:'Lahore', lat:31.4845, lng:74.3487 },
  { n:'DHA Phase 2',                 c:'Lahore', lat:31.4683, lng:74.3614 },
  { n:'DHA Phase 3',                 c:'Lahore', lat:31.4553, lng:74.3714 },
  { n:'DHA Phase 4',                 c:'Lahore', lat:31.4470, lng:74.3821 },
  { n:'DHA Phase 5',                 c:'Lahore', lat:31.4700, lng:74.4000 },
  { n:'DHA Phase 6',                 c:'Lahore', lat:31.4600, lng:74.4100 },
  { n:'DHA Phase 8',                 c:'Lahore', lat:31.4400, lng:74.4300 },
  { n:'DHA Phase 9',                 c:'Lahore', lat:31.4200, lng:74.4500 },
  { n:'Bahria Town Lahore',          c:'Lahore', lat:31.3650, lng:74.1770 },
  { n:'Bahria Orchard',              c:'Lahore', lat:31.3900, lng:74.1500 },
  { n:'Gulberg',                     c:'Lahore', lat:31.5208, lng:74.3498 },
  { n:'Gulberg III',                 c:'Lahore', lat:31.5150, lng:74.3450 },
  { n:'Model Town',                  c:'Lahore', lat:31.4828, lng:74.3288 },
  { n:'Johar Town',                  c:'Lahore', lat:31.4697, lng:74.2744 },
  { n:'Township',                    c:'Lahore', lat:31.4622, lng:74.2677 },
  { n:'Faisal Town',                 c:'Lahore', lat:31.4953, lng:74.2853 },
  { n:'Wapda Town',                  c:'Lahore', lat:31.4533, lng:74.2744 },
  { n:'Iqbal Town',                  c:'Lahore', lat:31.4744, lng:74.3088 },
  { n:'Allama Iqbal Town',           c:'Lahore', lat:31.5000, lng:74.2833 },
  { n:'Garden Town',                 c:'Lahore', lat:31.5150, lng:74.3400 },
  { n:'Sabzazar',                    c:'Lahore', lat:31.5100, lng:74.2900 },
  { n:'LDA Avenue 1',                c:'Lahore', lat:31.4383, lng:74.2717 },
  { n:'Lake City',                   c:'Lahore', lat:31.5600, lng:74.4600 },
  { n:'Askari 10',                   c:'Lahore', lat:31.4800, lng:74.3600 },
  { n:'Askari 11',                   c:'Lahore', lat:31.4800, lng:74.4100 },
  { n:'Raiwind Road',                c:'Lahore', lat:31.3800, lng:74.2700 },
  { n:'Valencia Town',               c:'Lahore', lat:31.5330, lng:74.4350 },
  { n:'Cantt',                       c:'Lahore', lat:31.5200, lng:74.3700 },
  { n:'Shadman',                     c:'Lahore', lat:31.5450, lng:74.3250 },
  { n:'Samanabad',                   c:'Lahore', lat:31.5500, lng:74.2900 },
  { n:'Islampura',                   c:'Lahore', lat:31.5600, lng:74.2800 },
  { n:'Shahdara',                    c:'Lahore', lat:31.6200, lng:74.3100 },
  { n:'Wagah Town',                  c:'Lahore', lat:31.5700, lng:74.5100 },
  { n:'Muslim Town',                 c:'Lahore', lat:31.4950, lng:74.3050 },
  { n:'Punjab University',           c:'Lahore', lat:31.4700, lng:74.2600 },
  { n:'Cavalry Ground',              c:'Lahore', lat:31.5300, lng:74.3800 },
  { n:'Fortress Square',             c:'Lahore', lat:31.5250, lng:74.3850 },
  { n:'Green Town',                  c:'Lahore', lat:31.4650, lng:74.2950 },
  { n:'Mustafa Town',                c:'Lahore', lat:31.4900, lng:74.3200 },
  { n:'Gulshan Ravi',                c:'Lahore', lat:31.5700, lng:74.3000 },
  { n:'Shah Jamal',                  c:'Lahore', lat:31.5250, lng:74.3150 },
  { n:'Thokar Niaz Baig',            c:'Lahore', lat:31.4217, lng:74.2083 },
  { n:'Raza Town',                   c:'Lahore', lat:31.4800, lng:74.2600 },
  { n:'Revenue Society',             c:'Lahore', lat:31.4900, lng:74.3000 },
  { n:'Architects Society',          c:'Lahore', lat:31.4550, lng:74.2800 },
  { n:'Ali Park',                    c:'Lahore', lat:31.5550, lng:74.3200 },
  { n:'Canal View',                  c:'Lahore', lat:31.4950, lng:74.3650 },
  { n:'Paragon City',                c:'Lahore', lat:31.4250, lng:74.2350 },
  { n:'Overseas Enclave',            c:'Lahore', lat:31.5350, lng:74.4450 },
  // ── Karachi ─────────────────────────────────────────────────────────────────
  { n:'DHA Karachi Phase 1',         c:'Karachi', lat:24.8150, lng:67.0550 },
  { n:'DHA Karachi Phase 2',         c:'Karachi', lat:24.8000, lng:67.0650 },
  { n:'DHA Karachi Phase 5',         c:'Karachi', lat:24.7950, lng:67.0850 },
  { n:'DHA Karachi Phase 6',         c:'Karachi', lat:24.7850, lng:67.0950 },
  { n:'DHA Karachi Phase 7',         c:'Karachi', lat:24.7750, lng:67.1000 },
  { n:'DHA Karachi Phase 8',         c:'Karachi', lat:24.7700, lng:67.1100 },
  { n:'Bahria Town Karachi',         c:'Karachi', lat:25.0550, lng:66.9850 },
  { n:'Gulshan-e-Iqbal',             c:'Karachi', lat:24.9218, lng:67.0918 },
  { n:'North Nazimabad',             c:'Karachi', lat:24.9500, lng:67.0500 },
  { n:'PECHS',                       c:'Karachi', lat:24.8700, lng:67.0500 },
  { n:'Clifton',                     c:'Karachi', lat:24.8183, lng:67.0283 },
  { n:'Nazimabad',                   c:'Karachi', lat:24.9200, lng:67.0350 },
  { n:'Gulistan-e-Johar',            c:'Karachi', lat:24.9200, lng:67.1350 },
  { n:'FB Area',                     c:'Karachi', lat:24.9350, lng:67.0800 },
  { n:'Saddar',                      c:'Karachi', lat:24.8600, lng:67.0100 },
  { n:'Korangi',                     c:'Karachi', lat:24.8250, lng:67.1250 },
  { n:'Landhi',                      c:'Karachi', lat:24.8350, lng:67.1700 },
  { n:'Malir',                       c:'Karachi', lat:24.8750, lng:67.1900 },
  // ── Islamabad / Rawalpindi ───────────────────────────────────────────────────
  { n:'F-6',                         c:'Islamabad', lat:33.7200, lng:73.0700 },
  { n:'F-7',                         c:'Islamabad', lat:33.7100, lng:73.0600 },
  { n:'F-8',                         c:'Islamabad', lat:33.7000, lng:73.0500 },
  { n:'F-10',                        c:'Islamabad', lat:33.6950, lng:73.0250 },
  { n:'F-11',                        c:'Islamabad', lat:33.7050, lng:73.0100 },
  { n:'G-9',                         c:'Islamabad', lat:33.6900, lng:73.0450 },
  { n:'G-10',                        c:'Islamabad', lat:33.6850, lng:73.0350 },
  { n:'G-11',                        c:'Islamabad', lat:33.6950, lng:73.0200 },
  { n:'G-13',                        c:'Islamabad', lat:33.6600, lng:73.0000 },
  { n:'E-7',                         c:'Islamabad', lat:33.7350, lng:73.0900 },
  { n:'E-11',                        c:'Islamabad', lat:33.7100, lng:73.0300 },
  { n:'Bahria Town Islamabad',       c:'Islamabad', lat:33.5300, lng:73.1050 },
  { n:'DHA Islamabad',               c:'Islamabad', lat:33.5800, lng:73.0800 },
  { n:'PWD Housing Society',         c:'Islamabad', lat:33.6350, lng:73.0550 },
  { n:'Gulberg Islamabad',           c:'Islamabad', lat:33.6600, lng:73.0650 },
  { n:'Satellite Town',              c:'Rawalpindi', lat:33.6050, lng:73.0450 },
  { n:'Bahria Town Rawalpindi',      c:'Rawalpindi', lat:33.5500, lng:73.1100 },
  { n:'Askari 14',                   c:'Rawalpindi', lat:33.5700, lng:73.1200 },
  { n:'Chaklala Scheme',             c:'Rawalpindi', lat:33.6100, lng:73.1100 },
  // ── Faisalabad ───────────────────────────────────────────────────────────────
  { n:'Peoples Colony',              c:'Faisalabad', lat:31.4200, lng:73.1050 },
  { n:'Gulberg Faisalabad',          c:'Faisalabad', lat:31.4300, lng:73.0950 },
  { n:'Madina Town',                 c:'Faisalabad', lat:31.4400, lng:73.0850 },
  { n:'Millat Town',                 c:'Faisalabad', lat:31.4100, lng:73.1150 },
  { n:'Canal Road Faisalabad',       c:'Faisalabad', lat:31.4500, lng:73.1300 },
  { n:'DHA Faisalabad',              c:'Faisalabad', lat:31.4000, lng:73.1500 },
  // ── Other cities ─────────────────────────────────────────────────────────────
  { n:'Bahria Town Karachi 2',       c:'Karachi',   lat:25.0600, lng:66.9900 },
  { n:'Askari 5',                    c:'Lahore',    lat:31.5050, lng:74.3900 },
  { n:'Pak Arab Housing Society',    c:'Lahore',    lat:31.4550, lng:74.2600 },
  { n:'State Life Housing Society',  c:'Lahore',    lat:31.4450, lng:74.3100 },
  { n:'Sui Gas Housing Society',     c:'Lahore',    lat:31.4600, lng:74.3000 },
  { n:'Johar Town Phase 2',          c:'Lahore',    lat:31.4600, lng:74.2700 },
  { n:'Walton Road',                 c:'Lahore',    lat:31.5150, lng:74.3700 },
  { n:'Barkat Market',               c:'Lahore',    lat:31.5200, lng:74.3300 },
  { n:'MM Alam Road',                c:'Lahore',    lat:31.5200, lng:74.3500 },
  { n:'Jail Road',                   c:'Lahore',    lat:31.5150, lng:74.3100 },
  { n:'Ferozepur Road',              c:'Lahore',    lat:31.4500, lng:74.2500 },
  { n:'Multan Road Lahore',          c:'Lahore',    lat:31.4100, lng:74.2900 },
  { n:'Bedian Road',                 c:'Lahore',    lat:31.4000, lng:74.4200 },
];

const searchLocalAreas = (query) => {
    const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    return PK_AREAS
        .map(a => {
            const name = a.n.toLowerCase();
            const city = a.c.toLowerCase();
            let score = 0;
            if (name === q)                              score = 100;
            else if (name.startsWith(q))                 score = 80;
            else if (name.includes(q))                   score = 60;
            else if (q.split(' ').every(w => name.includes(w) || city.includes(w))) score = 40;
            return { ...a, score };
        })
        .filter(a => a.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(a => ({
            placeId:     `pk_${a.n.replace(/\s+/g,'_').toLowerCase()}`,
            description: `${a.n}, ${a.c}, Pakistan`,
            shortName:   `${a.n}, ${a.c}, Pakistan`,
            lat:         a.lat,
            lng:         a.lng,
        }));
};

// ── Nominatim (OSM) ───────────────────────────────────────────────────────────
const NOMINATIM   = 'https://nominatim.openstreetmap.org';
const NOM_HEADERS = { 'User-Agent': 'EcoTrackAI/1.0 (carbon-footprint-tracker)', 'Accept-Language': 'en' };

// ── HERE Maps (primary — best Pakistani street/area coverage, 250k free/mo) ───
const HERE_KEY  = process.env.HERE_MAPS_API_KEY;
const HERE_GEO  = 'https://geocode.search.hereapi.com/v1/geocode';
const HERE_LOOK = 'https://lookup.search.hereapi.com/v1/lookup';

const hereGeocode = async (query) => {
    if (!HERE_KEY) return [];
    try {
        const url  = `${HERE_GEO}?q=${encodeURIComponent(query)}&apiKey=${HERE_KEY}&lang=en&limit=8`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const data = await res.json();
        return (data.items || []).map(item => {
            const a = item.address || {};
            const parts = [a.street, a.district, a.city, a.countryName].filter(Boolean);
            const unique = parts.filter((v, i, arr) => arr.indexOf(v) === i);
            return {
                placeId:     item.id,
                displayName: a.label || unique.join(', '),
                shortName:   [a.street || a.district, a.city].filter(Boolean).join(', ') || a.label,
                lat:         item.position.lat,
                lng:         item.position.lng,
            };
        });
    } catch { return []; }
};

// HERE autocomplete uses geocode endpoint — tries Pakistan first, then worldwide
const hereAutocomplete = async (query) => {
    if (!HERE_KEY) return [];
    const toResult = (item) => {
        const a = item.address || {};
        const parts = [a.street || a.district, a.city, a.countryName].filter(Boolean);
        return {
            placeId:     item.id,
            description: a.label || item.title,
            shortName:   item.title || parts.join(', ') || a.label,
            lat:         item.position.lat,
            lng:         item.position.lng,
        };
    };
    try {
        // Run Pakistan-restricted and worldwide searches in parallel
        const [pkRes, wwRes] = await Promise.all([
            fetch(`${HERE_GEO}?q=${encodeURIComponent(query)}&apiKey=${HERE_KEY}&lang=en&limit=6&in=countryCode:PAK`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => ({ items: [] })),
            fetch(`${HERE_GEO}?q=${encodeURIComponent(query)}&apiKey=${HERE_KEY}&lang=en&limit=6`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => ({ items: [] })),
        ]);
        const seen    = new Set();
        const results = [];
        for (const item of [...(pkRes.items || []), ...(wwRes.items || [])]) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            results.push(toResult(item));
            if (results.length >= 8) break;
        }
        return results;
    } catch { return []; }
};

// HERE Lookup → resolve a HERE place ID to lat/lng (for items without position)
const hereLookup = async (id) => {
    if (!HERE_KEY) return null;
    try {
        const url  = `${HERE_LOOK}?id=${encodeURIComponent(id)}&apiKey=${HERE_KEY}&lang=en`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (!data.position) return null;
        return { lat: data.position.lat, lng: data.position.lng, address: data.address?.label };
    } catch { return null; }
};

// ── Google Maps (fallback if HERE key not set) ────────────────────────────────
const GOOGLE_KEY  = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_GEO  = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_AC   = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_DET  = 'https://maps.googleapis.com/maps/api/place/details/json';

// Google Geocoding → returns up to 8 results with lat/lng
const googleGeocode = async (query) => {
    if (!GOOGLE_KEY) return [];
    try {
        const url  = `${GOOGLE_GEO}?address=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&language=en`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const data = await res.json();
        if (data.status !== 'OK') return [];
        return data.results.slice(0, 8).map(r => {
            const ac      = r.address_components || [];
            const getName = (type) => ac.find(c => c.types.includes(type))?.long_name || '';
            const primary = ac[0]?.long_name || r.formatted_address.split(',')[0];
            const city    = getName('locality') || getName('sublocality_level_1') || getName('administrative_area_level_2');
            const country = getName('country');
            const parts   = [primary, city, country].filter(Boolean);
            const unique  = parts.filter((v, i, a) => a.indexOf(v) === i);
            return {
                placeId:     r.place_id,
                displayName: r.formatted_address,
                shortName:   unique.join(', '),
                lat:         r.geometry.location.lat,
                lng:         r.geometry.location.lng,
            };
        });
    } catch { return []; }
};

// Google Places Autocomplete → returns suggestions (no lat/lng) for partial queries
const googleAutocomplete = async (query) => {
    if (!GOOGLE_KEY) return [];
    try {
        const url  = `${GOOGLE_AC}?input=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&language=en&types=geocode`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.status !== 'OK') return [];
        return data.predictions.slice(0, 8).map(p => ({
            placeId:  p.place_id,
            fullName: p.description,
            mainText: p.structured_formatting?.main_text    || p.description.split(',')[0],
            subText:  p.structured_formatting?.secondary_text || '',
        }));
    } catch { return []; }
};

// Google Place Details → get lat/lng for a place_id
const googlePlaceDetails = async (placeId) => {
    if (!GOOGLE_KEY) return null;
    try {
        const url  = `${GOOGLE_DET}?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_KEY}&language=en`;
        const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.status !== 'OK') return null;
        const loc = data.result?.geometry?.location;
        return { lat: loc.lat, lng: loc.lng, address: data.result?.formatted_address };
    } catch { return null; }
};

// geocodePlace: HERE → Google → Nominatim fallback
const geocodePlace = async (query) => {
    if (HERE_KEY) {
        const results = await hereGeocode(query);
        if (results.length > 0) return { name: results[0].displayName, lat: results[0].lat, lng: results[0].lng };
    }
    if (GOOGLE_KEY) {
        const results = await googleGeocode(query);
        if (results.length > 0) return { name: results[0].displayName, lat: results[0].lat, lng: results[0].lng };
    }
    const url  = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;
    const res  = await fetch(url, { headers: NOM_HEADERS });
    const data = await res.json();
    if (!data.length) return null;
    return { name: data[0].display_name, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
};

const searchPlaces = async (query, limit = 15) => {
    // dedupe=0 → return ALL matching places with the same name worldwide
    const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1&dedupe=0`;
    const res  = await fetch(url, { headers: NOM_HEADERS, signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return data.map(p => {
        const a       = p.address || {};
        const suburb  = a.suburb || a.neighbourhood || a.quarter || a.city_district || '';
        const city    = a.city   || a.town  || a.village || a.county || '';
        const state   = a.state  || '';
        const country = a.country || '';
        // Build a meaningful short name: neighbourhood → city → country
        const shortParts = [suburb, city, country].filter(Boolean);
        const shortName  = shortParts.length >= 2
            ? shortParts.join(', ')
            : p.display_name.split(',').slice(0, 3).join(',').trim();
        // Full readable label: suburb, city, state, country
        const fullParts = [suburb, city, state, country].filter(Boolean);
        const fullLabel = fullParts.length >= 2
            ? fullParts.join(', ')
            : p.display_name;
        return {
            placeId:     p.place_id,
            displayName: fullLabel,
            shortName,
            lat:  parseFloat(p.lat),
            lng:  parseFloat(p.lon),
            type: p.type,
        };
    });
};

// ─── @route  POST /api/maps/distance ─────────────────────────────────────────
exports.getDistance = async (req, res, next) => {
    try {
        const { origin, destination, subType, originLat, originLng, destLat, destLng } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ success: false, error: 'Origin and destination are required' });
        }

        // Use pre-resolved coordinates if the client already geocoded; otherwise geocode now
        let place1, place2;

        if (originLat && originLng) {
            place1 = { name: origin, lat: parseFloat(originLat), lng: parseFloat(originLng) };
        } else {
            place1 = await geocodePlace(origin);
            if (!place1) return res.status(400).json({ success: false, error: `Place not found: "${origin}"` });
        }

        if (destLat && destLng) {
            place2 = { name: destination, lat: parseFloat(destLat), lng: parseFloat(destLng) };
        } else {
            place2 = await geocodePlace(destination);
            if (!place2) return res.status(400).json({ success: false, error: `Place not found: "${destination}"` });
        }

        const isFlightMode = ['flight_domestic', 'flight_international'].includes(subType);
        const straightLine = haversineKm(place1.lat, place1.lng, place2.lat, place2.lng);

        let distanceKm, durationMin, routeMethod;

        if (isFlightMode) {
            // Great-circle (Haversine) is the correct measure for flight distances
            distanceKm  = parseFloat(straightLine.toFixed(1));
            durationMin = Math.round((distanceKm / 800) * 60);
            routeMethod = 'haversine_flight';
        } else {
            // Use OSRM for real road distance — same routing engine used in DirectionsScreen
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${place1.lng},${place1.lat};${place2.lng},${place2.lat}?overview=false`;
                const ctrl    = new AbortController();
                const tid     = setTimeout(() => ctrl.abort(), 10000);
                const osrmRes = await fetch(osrmUrl, { signal: ctrl.signal });
                clearTimeout(tid);
                const osrmData = await osrmRes.json();

                if (osrmData.routes && osrmData.routes[0]) {
                    distanceKm  = parseFloat((osrmData.routes[0].distance / 1000).toFixed(1));
                    durationMin = Math.round(osrmData.routes[0].duration / 60);
                    routeMethod = 'osrm_road';
                } else {
                    throw new Error('no_route');
                }
            } catch (_) {
                // OSRM unavailable — fall back to straight-line × 1.3 estimate
                distanceKm  = parseFloat((straightLine * 1.3).toFixed(1));
                durationMin = Math.round((distanceKm / 60) * 60);
                routeMethod = 'haversine_estimate';
            }
        }

        const durationTxt = durationMin >= 60
            ? `~${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
            : `~${durationMin}m`;

        res.status(200).json({
            success:      true,
            distanceKm,
            durationMin,
            distanceText: `${distanceKm} km`,
            durationText: durationTxt,
            origin:       place1.name,
            destination:  place2.name,
            originCoords: { lat: place1.lat, lng: place1.lng },
            destCoords:   { lat: place2.lat, lng: place2.lng },
            method:       routeMethod,
        });

    } catch (err) {
        next(err);
    }
};

// ─── Eco Spots Template Database ─────────────────────────────────────────────
const SPOTS_DB = {
  recycling: [
    { name: 'City Recycling Center',        addr: 'Industrial Zone',              offset: [ 0.012,  0.008] },
    { name: 'Green Waste Hub',              addr: 'Near Main Market',             offset: [ 0.023, -0.015] },
    { name: 'Eco Recycling Point',          addr: 'Township Area',                offset: [-0.018,  0.021] },
    { name: 'Community Recycling Depot',    addr: 'Block C, Sector 3',            offset: [ 0.031,  0.011] },
    { name: 'Blue Bin Collection Hub',      addr: 'Near Civic Center',            offset: [-0.009, -0.027] },
  ],
  ev_charging: [
    { name: 'EV Fast Charging Station',     addr: 'Main Boulevard',               offset: [ 0.009,  0.014] },
    { name: 'Green Charge Point',           addr: 'Parking Plaza Level 2',        offset: [ 0.019, -0.011] },
    { name: 'City EV Hub',                  addr: 'Bus Terminal Road',             offset: [ 0.027,  0.007] },
    { name: 'Solar EV Charging',            addr: 'Civic Plaza',                  offset: [-0.021, -0.013] },
    { name: 'Public EV Charger',            addr: 'Shopping Mall Parking',        offset: [-0.014,  0.018] },
  ],
  organic: [
    { name: 'Organic Farmers Market',       addr: 'Weekly Bazaar Ground',         offset: [ 0.007,  0.017] },
    { name: 'Green Valley Organic Store',   addr: 'Commercial Area',              offset: [ 0.016, -0.009] },
    { name: "Nature's Basket",              addr: 'Main Market Street',           offset: [-0.011,  0.022] },
    { name: 'Farm Fresh Organics',          addr: 'Near Canal Road',              offset: [ 0.028,  0.013] },
    { name: 'Eco Grocery Hub',              addr: 'Gulberg Main Boulevard',       offset: [-0.016, -0.019] },
  ],
  park: [
    { name: 'City Botanical Garden',        addr: 'Central Park Road',            offset: [ 0.011,  0.019] },
    { name: 'Green Lung Park',              addr: 'Gulshan-e-Iqbal',              offset: [ 0.022, -0.013] },
    { name: 'Eco Nature Reserve',           addr: 'Ring Road Near Exit 5',        offset: [-0.017,  0.024] },
    { name: 'Riverside Green Park',         addr: 'Canal Bank Road',              offset: [ 0.033,  0.008] },
    { name: 'Community Forest Park',        addr: 'Model Town Extension',         offset: [-0.007, -0.028] },
  ],
  nursery: [
    { name: 'Green Thumb Nursery',          addr: 'Garden Town Road',             offset: [ 0.008,  0.016] },
    { name: 'Plant Paradise',               addr: 'Near Botanical Garden',        offset: [ 0.018, -0.012] },
    { name: 'Eco Plant House',              addr: 'Nursery Colony',               offset: [-0.013,  0.020] },
    { name: 'City Flower & Plant Mart',     addr: 'Shadman Market',               offset: [ 0.029,  0.006] },
    { name: 'Forest Seedlings Center',      addr: 'Government Nursery Road',      offset: [-0.020, -0.014] },
  ],
};

const RATINGS  = [3.8, 4.1, 4.3, 4.5, 4.7, 4.2, 3.9, 4.6];
const REVIEWS  = [18, 34, 52, 87, 124, 210, 43, 67];

const TYPE_LABELS = {
    recycling: 'Recycling', ev_charging: 'EV Charging', organic: 'Organic Store',
    park: 'Nature Park', nursery: 'Plant Nursery',
};

const buildSpots = (userLat, userLng, spotType, templates) =>
    templates.map((t, i) => {
        const spotLat = parseFloat((userLat + t.offset[0]).toFixed(6));
        const spotLng = parseFloat((userLng + t.offset[1]).toFixed(6));
        return {
            id:          `${spotType}_${i}`,
            name:        t.name,
            address:     t.addr,
            lat:         spotLat,
            lng:         spotLng,
            distance:    haversineKm(userLat, userLng, spotLat, spotLng),
            rating:      RATINGS[i % RATINGS.length],
            reviews:     REVIEWS[i % REVIEWS.length],
            open:        i % 3 !== 2,
            type:        spotType,
            typeLabel:   TYPE_LABELS[spotType] || spotType,
        };
    });

// ─── @route  GET /api/maps/nearby ────────────────────────────────────────────
exports.nearbyPlaces = (req, res) => {
    const { lat, lng, type = 'recycling', query = '' } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ success: false, error: 'Valid lat and lng are required' });
    }

    const q = query.toLowerCase().trim();

    let places;

    if (type === 'all') {
        // Cross-category search — scan every type
        places = Object.entries(SPOTS_DB).flatMap(([spotType, templates]) =>
            buildSpots(userLat, userLng, spotType, templates)
        );
    } else {
        const templates = SPOTS_DB[type] || SPOTS_DB['park'];
        places = buildSpots(userLat, userLng, type, templates);
    }

    if (q) {
        places = places.filter(p =>
            p.name.toLowerCase().includes(q)        ||
            p.address.toLowerCase().includes(q)     ||
            p.typeLabel.toLowerCase().includes(q)
        );
    }

    places.sort((a, b) => a.distance - b.distance);

    res.status(200).json({ success: true, places, fallback: false, count: places.length });
};

// ─── Overpass API — real OSM places near user ────────────────────────────────
const OVERPASS_MIRRORS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
];

const OVERPASS_TAGS = {
  // Parks — include recreation ground & sports fields common in South Asian cities
  park: [
    ['leisure','park'], ['leisure','garden'], ['leisure','nature_reserve'],
    ['leisure','recreation_ground'], ['leisure','pitch'], ['landuse','recreation_ground'],
  ],
  // Nurseries — 'shop=nursery' used informally by many Pakistani OSM mappers
  nursery: [
    ['shop','garden_centre'], ['shop','plant'], ['shop','nursery'],
    ['landuse','plant_nursery'], ['shop','florist'],
  ],
  recycling: [
    ['amenity','recycling'], ['amenity','waste_disposal'], ['amenity','waste_transfer_station'],
  ],
  organic: [
    ['shop','organic'], ['shop','health_food'], ['shop','greengrocer'],
    ['shop','farm'], ['shop','vegetables'], ['shop','fruit'],
  ],
  ev_charging: [['amenity','charging_station']],
};

const buildOverpassQuery = (lat, lng, radiusM, tags) => {
    const parts = tags.flatMap(([k, v]) => [
        `node["${k}"="${v}"](around:${radiusM},${lat},${lng});`,
        `way["${k}"="${v}"](around:${radiusM},${lat},${lng});`,
    ]).join('\n');
    return `[out:json][timeout:25];\n(\n${parts}\n);\nout center 50;`;
};

// ─── Structured Nominatim tags per category ───────────────────────────────────
// Use exact OSM tag params (amenity=, shop=, leisure=) instead of keyword text
// search — prevents "anything with 'ev' in the name" false matches.
const NOM_STRUCTURED_TAGS = {
    park:       [{ leisure:'park' }, { leisure:'garden' }, { leisure:'nature_reserve' }, { leisure:'recreation_ground' }],
    nursery:    [{ shop:'garden_centre' }, { shop:'plant' }, { shop:'nursery' }, { landuse:'plant_nursery' }, { shop:'florist' }],
    recycling:  [{ amenity:'recycling' }, { amenity:'waste_disposal' }],
    organic:    [{ shop:'organic' }, { shop:'health_food' }, { shop:'greengrocer' }, { shop:'farm' }, { shop:'vegetables' }],
    ev_charging:[{ amenity:'charging_station' }],
};

// ─── Helper: extract clean address from Nominatim element ────────────────────
const nomAddress = (el) => {
    const a = el.address || {};
    const parts = [
        a.road || a.street || a.pedestrian || a.path || '',
        a.suburb || a.neighbourhood || a.city_district || a.quarter || '',
        a.city   || a.town || a.village || a.county || '',
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : el.display_name.split(',').slice(0, 3).join(', ');
};

const nomToPlace = (el, userLat, userLng, type) => {
    const elLat = parseFloat(el.lat);
    const elLng = parseFloat(el.lon);
    return {
        id:        `nom_${el.place_id}`,
        name:      el.name || el.display_name.split(',')[0].trim(),
        address:   nomAddress(el),
        lat:       elLat,
        lng:       elLng,
        distance:  haversineKm(userLat, userLng, elLat, elLng),
        type,
        typeLabel: TYPE_LABELS[type] || type,
        source:    'nominatim',
    };
};

// ─── Reverse-geocode coordinates → city + country info ───────────────────────
const reverseGeocode = async (lat, lng) => {
    try {
        const url  = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const res  = await fetch(url, { headers: NOM_HEADERS, signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const a    = data.address || {};
        return {
            city:        a.city || a.town || a.village || a.county || a.state || '',
            countryCode: (a.country_code || '').toLowerCase(),   // e.g. 'pk', 'us', 'gb'
            country:     a.country || '',
            // bounding box of the city for viewbox filtering
            bb: data.boundingbox || null,   // [minLat, maxLat, minLng, maxLng]
        };
    } catch { return { city: '', countryCode: '', country: '', bb: null }; }
};

// ─── Nominatim search using exact OSM tag params ─────────────────────────────
// Uses amenity=, shop=, leisure= structured params instead of free-text q= so
// only proper tag-matched places are returned (no "anything named ev…" noise).
// Viewbox is wider for sparse categories (EV / recycling) since they're rare.
const nominatimCitySearch = async (userLat, userLng, type, geo, limit = 15) => {
    const { countryCode } = geo;
    const sparse  = type === 'ev_charging' || type === 'recycling';
    const delta   = sparse ? 0.9 : 0.45;   // 100 km for sparse, 50 km for common
    const viewbox = `${userLng - delta},${userLat + delta},${userLng + delta},${userLat - delta}`;

    const tagGroups = type === 'all'
        ? Object.entries(NOM_STRUCTURED_TAGS).flatMap(([t, tags]) => tags.map(tag => ({ qType: t, tag })))
        : (NOM_STRUCTURED_TAGS[type] || []).map(tag => ({ qType: type, tag }));

    const seen    = new Set();
    const results = [];

    for (const { qType, tag } of tagGroups) {
        if (results.length >= limit) break;
        try {
            const params = new URLSearchParams({
                format:         'json',
                limit:          '10',
                addressdetails: '1',
                viewbox,
                bounded:        '1',
                ...(countryCode && { countrycodes: countryCode }),
                ...tag,   // e.g. { amenity: 'charging_station' } — exact OSM tag match
            });
            const res  = await fetch(`${NOMINATIM}/search?${params}`, { headers: NOM_HEADERS, signal: AbortSignal.timeout(7000) });
            const data = await res.json();
            for (const el of data) {
                if (seen.has(el.place_id) || results.length >= limit) continue;
                const elCC = (el.address?.country_code || '').toLowerCase();
                if (countryCode && elCC && elCC !== countryCode) continue;
                seen.add(el.place_id);
                results.push(nomToPlace(el, userLat, userLng, qType));
            }
        } catch { /* skip failed tag */ }
    }

    return results.sort((a, b) => a.distance - b.distance);
};

exports.realNearbyPlaces = async (req, res) => {
    const { lat, lng, type = 'park', query = '' } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ success: false, error: 'Valid lat and lng required' });
    }

    const q       = query.toLowerCase().trim();
    const tagSets = type === 'all'
        ? Object.values(OVERPASS_TAGS).flat()
        : (OVERPASS_TAGS[type] ?? OVERPASS_TAGS['park']);

    const applyFilter = (places) => q
        ? places.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.address || '').toLowerCase().includes(q))
        : places;

    // EV chargers and recycling centres are very sparse — search wider.
    // Everything else: 15 km as the user requested.
    const radiusM = (type === 'ev_charging' || type === 'recycling') ? 25000 : 15000;

    // ── 1. Overpass — real OSM data, accurate pin-point coordinates ──────────
    try {
        const overpassQuery = buildOverpassQuery(userLat, userLng, radiusM, tagSets);
        let data = null;
        for (const mirror of OVERPASS_MIRRORS) {
            try {
                const response = await fetch(mirror, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body:    `data=${encodeURIComponent(overpassQuery)}`,
                    signal:  AbortSignal.timeout(14000),
                });
                if (!response.ok) continue;
                data = await response.json();
                if (data?.elements) break;
            } catch { continue; }
        }
        if (!data) throw new Error('all mirrors failed');

        let places = (data.elements ?? []).map(el => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            if (!elLat || !elLng) return null;
            const tags = el.tags || {};
            // Only return places with a real name — unnamed nodes land on random spots
            const name = tags.name || tags['name:en'] || tags['name:ur'] || null;
            if (!name) return null;
            const street  = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
            const area    = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'] || '';
            const city    = tags['addr:city'] || tags['addr:town'] || '';
            const elType  = type === 'all'
                ? (Object.entries(OVERPASS_TAGS).find(([, ts]) => ts.some(([k, v]) => tags[k] === v))?.[0] || type)
                : type;
            return {
                id:        `osm_${el.type}_${el.id}`,
                name,
                address:   [street, area, city].filter(Boolean).join(', '),
                lat:       elLat,
                lng:       elLng,
                distance:  haversineKm(userLat, userLng, elLat, elLng),
                type:      elType,
                typeLabel: TYPE_LABELS[elType] || elType,
                source:    'openstreetmap',
            };
        }).filter(Boolean);

        places = applyFilter(places).sort((a, b) => a.distance - b.distance);
        if (places.length > 0)
            return res.status(200).json({ success: true, places: places.slice(0, 30), count: places.length, source: 'openstreetmap' });
    } catch { /* Overpass unavailable — try Nominatim */ }

    // ── 2. Nominatim — exact OSM tag structured search, same country ─────────
    const geo = await reverseGeocode(userLat, userLng);
    try {
        let places = await nominatimCitySearch(userLat, userLng, type, geo, 25);
        places = applyFilter(places).sort((a, b) => a.distance - b.distance);
        if (places.length > 0)
            return res.status(200).json({ success: true, places: places.slice(0, 25), count: places.length, source: 'nominatim', city: geo.city });
    } catch { /* continue */ }

    // ── 3. No real data — return empty, never return fake coordinates ─────────
    // Fake offset-based locations land on random houses/offices, which is worse
    // than showing nothing. The frontend will show the category-specific empty state.
    return res.status(200).json({ success: true, places: [], count: 0, source: 'none', city: geo?.city });
};

// ─── @route  GET /api/maps/text-search ───────────────────────────────────────
// Google-Maps-style: free text query + user coords → real OSM places on the map
exports.textSearch = async (req, res, next) => {
    try {
        const { q, lat, lng } = req.query;
        if (!q || !lat || !lng)
            return res.status(400).json({ success: false, error: 'q, lat, lng are required' });

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const query   = q.trim();
        const seen    = new Set();
        let   all     = [];

        const addPlace = (p) => {
            const key = `${p.name.toLowerCase().slice(0,20)}_${parseFloat(p.lat).toFixed(3)}_${parseFloat(p.lng).toFixed(3)}`;
            if (seen.has(key)) return;
            seen.add(key);
            all.push(p);
        };

        // ── 1. Overpass — name text search near user ──────────────────────────
        try {
            const overpassQ = `[out:json][timeout:15];
(
  node["name"~"${query}",i](around:25000,${userLat},${userLng});
  way["name"~"${query}",i](around:25000,${userLat},${userLng});
  node["amenity"~"${query}",i](around:25000,${userLat},${userLng});
);
out center 20;`;
            for (const mirror of OVERPASS_MIRRORS) {
                try {
                    const resp = await fetch(mirror, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `data=${encodeURIComponent(overpassQ)}`,
                        signal: AbortSignal.timeout(10000),
                    });
                    if (!resp.ok) continue;
                    const data = await resp.json();
                    for (const el of (data.elements ?? [])) {
                        const elLat = el.lat ?? el.center?.lat;
                        const elLng = el.lon ?? el.center?.lon;
                        if (!elLat || !elLng) continue;
                        const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:ur'];
                        if (!name) continue;
                        const street = [el.tags?.['addr:housenumber'], el.tags?.['addr:street']].filter(Boolean).join(' ');
                        const area   = el.tags?.['addr:suburb'] || el.tags?.['addr:neighbourhood'] || '';
                        addPlace({
                            id: `osm_${el.type}_${el.id}`, name,
                            address:  [street, area].filter(Boolean).join(', '),
                            lat: elLat, lng: elLng,
                            distance: haversineKm(userLat, userLng, elLat, elLng),
                            type: 'search', typeLabel: el.tags?.amenity || el.tags?.leisure || 'Place',
                            source: 'openstreetmap',
                        });
                    }
                    break;
                } catch { continue; }
            }
        } catch { /* continue */ }

        // ── 2. Nominatim text search — searches OSM by keyword + city ─────────
        try {
            const geo = await reverseGeocode(userLat, userLng);
            const cityHint = geo?.city || '';
            const searchQ = cityHint ? `${query} ${cityHint}` : query;
            const vb = `${userLng - 0.8},${userLat - 0.8},${userLng + 0.8},${userLat + 0.8}`;
            const url = `${NOMINATIM}/search?q=${encodeURIComponent(searchQ)}&format=json&limit=20&addressdetails=1&viewbox=${vb}&bounded=0`;
            const resp = await fetch(url, {
                headers: { 'User-Agent': 'EcoTrack-AI/1.0 abdullahjarale@gmail.com' },
                signal: AbortSignal.timeout(8000),
            });
            const data = await resp.json();
            for (const item of (data ?? [])) {
                const pLat = parseFloat(item.lat);
                const pLng = parseFloat(item.lon);
                const name = item.display_name.split(',')[0].trim();
                if (!name) continue;
                const parts = item.display_name.split(',');
                const address = parts.slice(1, 4).join(',').trim();
                addPlace({
                    id: `nom_${item.place_id}`, name,
                    address, lat: pLat, lng: pLng,
                    distance: haversineKm(userLat, userLng, pLat, pLng),
                    type: 'search', typeLabel: item.type || item.class || 'Place',
                    source: 'openstreetmap',
                });
            }
        } catch { /* continue */ }

        all.sort((a, b) => a.distance - b.distance);

        // ── 3. Simulated fallback — keyword-matched spots so map is never empty ─
        if (all.length === 0) {
            const lower = query.toLowerCase();
            let fallback = Object.entries(SPOTS_DB).flatMap(([t, tpls]) =>
                buildSpots(userLat, userLng, t, tpls).filter(p =>
                    p.name.toLowerCase().includes(lower) ||
                    p.typeLabel.toLowerCase().includes(lower) ||
                    lower.split(' ').some(w => p.name.toLowerCase().includes(w))
                )
            );
            if (fallback.length === 0) {
                fallback = Object.entries(SPOTS_DB).flatMap(([t, tpls]) =>
                    buildSpots(userLat, userLng, t, tpls)
                ).sort((a, b) => a.distance - b.distance).slice(0, 10);
            }
            return res.status(200).json({ success: true, places: fallback, count: fallback.length, source: 'simulated' });
        }

        res.status(200).json({ success: true, places: all.slice(0, 20), count: all.length, source: 'openstreetmap' });
    } catch (err) { next(err); }
};

// ─── @route  GET /api/maps/autocomplete ──────────────────────────────────────
// Priority: Local PK DB → HERE Maps → Nominatim OSM
exports.autocomplete = async (req, res) => {
    const { input } = req.query;
    if (!input || input.trim().length < 2) {
        return res.status(200).json({ success: true, predictions: [] });
    }
    try {
        const q = input.trim();

        // ── 1. Local Pakistan DB (instant, covers housing societies OSM misses) ─
        const local = searchLocalAreas(q);
        const seen  = new Set(local.map(p => p.shortName.toLowerCase()));
        let predictions = [...local];

        // ── 2. HERE Maps — best street/area coverage worldwide ───────────────────
        if (HERE_KEY) {
            const hereResults = await hereAutocomplete(q);
            for (const p of hereResults) {
                const k = (p.shortName || '').toLowerCase();
                if (seen.has(k)) continue;
                seen.add(k);
                predictions.push(p);
                if (predictions.length >= 12) break;
            }
        }

        // ── 3. Nominatim fallback if HERE not configured ─────────────────────────
        if (!HERE_KEY) {
            const raw = await searchPlaces(q, 20);
            const osm = raw
                .filter(p => { const k = p.shortName.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
                .slice(0, 10)
                .map(p => ({ placeId: p.placeId, description: p.displayName, shortName: p.shortName, lat: p.lat, lng: p.lng }));
            predictions = [...predictions, ...osm];
        }

        const source = HERE_KEY ? 'local+here' : 'local+osm';
        res.status(200).json({ success: true, predictions: predictions.slice(0, 12), source });
    } catch {
        res.status(200).json({ success: true, predictions: [] });
    }
};

// ─── @route  GET /api/maps/lookup ────────────────────────────────────────────
// Resolve a HERE place ID to lat/lng (called when autocomplete item lacks coords)
exports.lookupPlace = async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'id is required' });
    const result = await hereLookup(id);
    if (!result) return res.status(404).json({ success: false, error: 'Place not found' });
    res.status(200).json({ success: true, ...result });
};
