const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
    getIsland, earnCredits, placeItem, removeItem,
} = require('../controllers/islandController');

router.use(protect); // all island routes require auth

router.get('/',                getIsland);
router.post('/earn',           earnCredits);
router.post('/place',          placeItem);
router.delete('/remove/:x/:y', removeItem);

module.exports = router;
