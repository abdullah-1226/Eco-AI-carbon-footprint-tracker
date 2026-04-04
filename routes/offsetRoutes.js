const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getPrograms, contribute, getBalance, getHistory } = require('../controllers/offsetController');

router.use(protect);

router.get('/programs',   getPrograms);
router.post('/contribute', contribute);
router.get('/balance',    getBalance);
router.get('/history',    getHistory);

module.exports = router;
