const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const { getDistance, autocomplete, nearbyPlaces, realNearbyPlaces, lookupPlace, textSearch } = require('../controllers/mapsController');

router.use(protect);
router.post('/distance',     getDistance);
router.get('/nearby',        nearbyPlaces);
router.get('/real-nearby',   realNearbyPlaces);
router.get('/text-search',   textSearch);
router.get('/autocomplete',  autocomplete);
router.get('/lookup',        lookupPlace);

module.exports = router;
