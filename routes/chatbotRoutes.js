const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { chat } = require('../controllers/chatbotController');

router.post('/', protect, chat);

module.exports = router;
