const Challenge  = require('../models/Challenge');
const User       = require('../models/User');
const UserStats  = require('../models/UserStats');
const Activity   = require('../models/Activity');
const EmissionAlert = require('../models/EmissionAlert');

// ── Challenge badges ──────────────────────────────────────────────────────────
const CHALLENGE_BADGES = {
    challenge_winner:  { id: 'challenge_winner',  name: 'Challenge Winner',   icon: '⚔️' },
    eco_champion:      { id: 'eco_champion',       name: 'Eco Champion',       icon: '🏆' },
    streak_king:       { id: 'streak_king',        name: 'Streak King',        icon: '🔥' },
    activity_master:   { id: 'activity_master',    name: 'Activity Master',    icon: '📝' },
    carbon_crusher:    { id: 'carbon_crusher',     name: 'Carbon Crusher',     icon: '💪' },
};

const METRIC_BADGE = {
    eco_score:        'eco_champion',
    activities_count: 'activity_master',
    streak:           'streak_king',
    co2_saved:        'carbon_crusher',
};

// ── Helper: get current metric value for a user ───────────────────────────────
async function getMetricValue(userId, metric) {
    const stats = await UserStats.findOne({ user: userId });
    switch (metric) {
        case 'eco_score':        return stats?.ecoScore ?? 0;
        case 'activities_count': return stats?.totalActivities ?? 0;
        case 'streak':           return stats?.currentStreak ?? 0;
        case 'co2_saved': {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
            const acts = await Activity.find({ user: userId, date: { $gte: weekAgo } });
            return acts.reduce((s, a) => s + (a.co2e ?? a.carbonFootprint ?? 0), 0);
        }
        default: return 0;
    }
}

// ── @route  GET /api/challenges  ─────────────────────────────────────────────
exports.getChallenges = async (req, res, next) => {
    try {
        const challenges = await Challenge.find({
            $or: [{ challenger: req.user._id.toString() }, { opponent: req.user._id.toString() }],
        })
        .populate('challenger', 'name avatar')
        .populate('opponent',   'name avatar')
        .populate('winner',     'name')
        .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: challenges });
    } catch (err) { next(err); }
};

// ── @route  POST /api/challenges/send  ───────────────────────────────────────
// Body: { opponent_email, metric, duration_days }
exports.sendChallenge = async (req, res, next) => {
    try {
        const { opponent_email, metric = 'eco_score', duration_days = 7 } = req.body;

        if (!opponent_email) return res.status(400).json({ success: false, error: 'Opponent email is required.' });
        if (opponent_email === req.user.email)
            return res.status(400).json({ success: false, error: 'You cannot challenge yourself.' });

        const opponent = await User.findOne({ email: opponent_email.toLowerCase().trim() });
        if (!opponent) return res.status(404).json({ success: false, error: 'No user found with that email.' });

        // Check no active challenge already exists between these two users
        const existing = await Challenge.findOne({
            $or: [
                { challenger: req.user._id.toString(), opponent: opponent._id, status: { $in: ['pending', 'active'] } },
                { challenger: opponent._id, opponent: req.user._id.toString(), status: { $in: ['pending', 'active'] } },
            ],
        });
        if (existing) return res.status(409).json({ success: false, error: 'An active challenge already exists with this user.' });

        const challenge = await Challenge.create({
            challenger: req.user._id.toString(),
            opponent:   opponent._id,
            metric,
            duration_days,
        });

        // Notify opponent
        await EmissionAlert.create({
            user:      opponent._id,
            alertType: 'challenge_invite',
            title:     '⚔️ Challenge Received!',
            message:   `${req.user.name} challenged you to a ${duration_days}-day ${metric.replace(/_/g,' ')} battle! Accept in the Challenges tab.`,
            icon:      '⚔️',
        });

        const populated = await challenge.populate([
            { path: 'challenger', select: 'name avatar' },
            { path: 'opponent',   select: 'name avatar' },
        ]);

        res.status(201).json({ success: true, data: populated, message: `Challenge sent to ${opponent.name}!` });
    } catch (err) { next(err); }
};

// ── @route  PUT /api/challenges/:id/accept  ──────────────────────────────────
exports.acceptChallenge = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found.' });
        if (challenge.opponent.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, error: 'Only the opponent can accept.' });
        if (challenge.status !== 'pending')
            return res.status(400).json({ success: false, error: 'Challenge is not pending.' });

        // Take starting snapshots
        const [chalSnap, oppSnap] = await Promise.all([
            getMetricValue(challenge.challenger, challenge.metric),
            getMetricValue(challenge.opponent,   challenge.metric),
        ]);

        const startsAt = new Date();
        const endsAt   = new Date(startsAt.getTime() + challenge.duration_days * 24 * 60 * 60 * 1000);

        challenge.status           = 'active';
        challenge.challenger_start = chalSnap;
        challenge.opponent_start   = oppSnap;
        challenge.starts_at        = startsAt;
        challenge.ends_at          = endsAt;
        await challenge.save();

        // Notify challenger
        await EmissionAlert.create({
            user:      challenge.challenger,
            alertType: 'challenge_accepted',
            title:     '⚔️ Challenge Accepted!',
            message:   `${req.user.name} accepted your challenge! The battle begins now — ${challenge.duration_days} days to prove yourself.`,
            icon:      '⚔️',
        });

        res.status(200).json({ success: true, data: challenge, message: 'Challenge accepted! Battle starts now.' });
    } catch (err) { next(err); }
};

// ── @route  PUT /api/challenges/:id/decline  ─────────────────────────────────
exports.declineChallenge = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found.' });
        if (challenge.opponent.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, error: 'Only the opponent can decline.' });

        challenge.status = 'declined';
        await challenge.save();

        res.status(200).json({ success: true, message: 'Challenge declined.' });
    } catch (err) { next(err); }
};

// ── @route  POST /api/challenges/:id/complete  ───────────────────────────────
// Called manually or by a cron job when ends_at has passed
exports.completeChallenge = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id)
            .populate('challenger', 'name')
            .populate('opponent',   'name');

        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found.' });
        if (challenge.status !== 'active')
            return res.status(400).json({ success: false, error: 'Challenge is not active.' });

        const [chalFinal, oppFinal] = await Promise.all([
            getMetricValue(challenge.challenger._id, challenge.metric),
            getMetricValue(challenge.opponent._id,   challenge.metric),
        ]);

        const chalProgress = chalFinal - challenge.challenger_start;
        const oppProgress  = oppFinal  - challenge.opponent_start;

        let winner = null;
        let winnerName = 'No one (it\'s a tie!)';

        if (chalProgress > oppProgress) {
            winner     = challenge.challenger._id;
            winnerName = challenge.challenger.name;
        } else if (oppProgress > chalProgress) {
            winner     = challenge.opponent._id;
            winnerName = challenge.opponent.name;
        }

        const badgeId  = METRIC_BADGE[challenge.metric] ?? 'challenge_winner';
        const badge    = CHALLENGE_BADGES[badgeId];

        challenge.challenger_final = chalFinal;
        challenge.opponent_final   = oppFinal;
        challenge.winner           = winner;
        challenge.badge_awarded    = badge.id;
        challenge.status           = 'completed';
        await challenge.save();

        // Award badge to winner via alert
        if (winner) {
            await EmissionAlert.create({
                user:      winner,
                alertType: 'challenge_won',
                title:     `${badge.icon} Challenge Won!`,
                message:   `You won the challenge! You earned the "${badge.name}" badge. ${chalProgress > oppProgress ? `Your progress: ${chalProgress.toFixed(1)} vs ${oppProgress.toFixed(1)}` : ''}`,
                icon:      badge.icon,
            });
        }

        // Notify loser
        const loser = winner?.toString() === challenge.challenger._id.toString()
            ? challenge.opponent._id : challenge.challenger._id;
        if (winner) {
            await EmissionAlert.create({
                user:      loser,
                alertType: 'challenge_lost',
                title:     '⚔️ Challenge Ended',
                message:   `${winnerName} won the challenge. Keep logging eco activities to challenge them again!`,
                icon:      '⚔️',
            });
        }

        res.status(200).json({
            success: true,
            data: { challenge, winner: winnerName, badge },
            message: winner ? `${winnerName} wins and earns the ${badge.icon} ${badge.name} badge!` : 'It\'s a tie!',
        });
    } catch (err) { next(err); }
};

// ── @route  GET /api/challenges/search-user  ─────────────────────────────────
// ?email=xxx  — check if user exists before sending challenge
exports.searchUser = async (req, res, next) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('name email avatar');
        if (!user) return res.status(404).json({ success: false, error: 'No account found with that email.' });
        if (user._id.toString() === req.user._id.toString())
            return res.status(400).json({ success: false, error: 'That\'s your own account.' });
        res.status(200).json({ success: true, data: user });
    } catch (err) { next(err); }
};
