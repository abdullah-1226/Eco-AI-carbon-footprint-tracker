const express = require('express');
const router = express.Router();
const {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    getPostsByUser,
    likePost
} = require('../controllers/postController');

const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getPosts);
router.get('/:id', getPost);
router.get('/user/:userId', getPostsByUser);

// Protected routes (require authentication)
router.use(protect);

router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.put('/:id/like', likePost);

module.exports = router;
