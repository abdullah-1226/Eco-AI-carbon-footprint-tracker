const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const { getDistance, autocomplete, nearbyPlaces } = require('../controllers/mapsController');

router.use(protect);
router.post('/distance',     getDistance);
router.get('/nearby',        nearbyPlaces);
router.get('/autocomplete',  autocomplete);

module.exports = router;
