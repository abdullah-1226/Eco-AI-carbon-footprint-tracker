const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
    getPrograms, contribute, getBalance, getHistory,
    checkEmissionLimit, getCommunityGoal,
    getPatchProjects, getPatchEstimate, createPatchOrder,
} = require('../controllers/offsetController');

router.use(protect);

router.get('/programs',       getPrograms);
router.post('/contribute',    contribute);
router.get('/balance',        getBalance);
router.get('/history',        getHistory);
router.get('/check-limit',    checkEmissionLimit);
router.get('/community-goal', getCommunityGoal);

// Patch.io real carbon offset API (sandbox-safe)
router.get('/patch/projects', getPatchProjects);
router.get('/patch/estimate', getPatchEstimate);
router.post('/patch/order',   createPatchOrder);

module.exports = router;
