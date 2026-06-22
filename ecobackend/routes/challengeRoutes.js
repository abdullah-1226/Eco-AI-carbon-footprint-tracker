const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
    getChallenges, sendChallenge, acceptChallenge,
    declineChallenge, completeChallenge, searchUser,
} = require('../controllers/challengeController');

router.use(protect);

router.get('/',                    getChallenges);
router.get('/search-user',         searchUser);
router.post('/send',               sendChallenge);
router.put('/:id/accept',          acceptChallenge);
router.put('/:id/decline',         declineChallenge);
router.post('/:id/complete',       completeChallenge);

module.exports = router;
