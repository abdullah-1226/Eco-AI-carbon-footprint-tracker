const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
    logActivity,
    getActivities,
    getSummary,
    deleteActivity,
    getLeaderboard,
    getEmissionFactors,
    getAISuggestions,
    analyzeScenario,
} = require('../controllers/activityController');

router.use(protect);

router.get('/emission-factors',   getEmissionFactors);
router.post('/analyze-scenario',  analyzeScenario);
router.get('/leaderboard',      getLeaderboard);
router.get('/summary',          getSummary);
router.get('/suggestions',      getAISuggestions);
router.get('/',                 getActivities);
router.post('/',                logActivity);
router.delete('/:id',           deleteActivity);

module.exports = router;
