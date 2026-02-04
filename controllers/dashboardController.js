const User = require('../models/User');
const Post = require('../models/Post');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
    try {
        const userCount = await User.countDocuments();
        const postCount = await Post.countDocuments();
        const myPostCount = await Post.countDocuments({ user: req.user.id });

        // Get recent posts
        const recentPosts = await Post.find()
            .sort('-createdAt')
            .limit(5)
            .populate('user', 'name email')
            .select('title views likes createdAt');

        // Get my recent posts
        const myRecentPosts = await Post.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(5)
            .select('title views likes isPublished createdAt');

        // Get popular posts (most viewed)
        const popularPosts = await Post.find()
            .sort('-views')
            .limit(5)
            .populate('user', 'name')
            .select('title views likes');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers: userCount,
                    totalPosts: postCount,
                    myPosts: myPostCount
                },
                recentPosts,
                myRecentPosts,
                popularPosts,
                user: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user dashboard
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
    try {
        // Get user's posts
        const posts = await Post.find({ user: req.user.id })
            .sort('-createdAt')
            .limit(10);

        // Get user details
        const user = await User.findById(req.user.id).select('-password');

        res.status(200).json({
            success: true,
            data: {
                user,
                posts,
                message: `Welcome to your dashboard, ${user.name}!`
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get admin dashboard
// @route   GET /api/dashboard/admin
// @access  Private/Admin
exports.getAdminDashboard = async (req, res, next) => {
    try {
        // Only admins can access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access admin dashboard'
            });
        }

        const recentUsers = await User.find()
            .sort('-createdAt')
            .limit(10)
            .select('name email role createdAt');

        const recentPosts = await Post.find()
            .sort('-createdAt')
            .limit(10)
            .populate('user', 'name email')
            .select('title user views likes createdAt');

        const stats = {
            totalUsers: await User.countDocuments(),
            totalPosts: await Post.countDocuments(),
            publishedPosts: await Post.countDocuments({ isPublished: true }),
            unpublishedPosts: await Post.countDocuments({ isPublished: false })
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                recentUsers,
                recentPosts,
                admin: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
