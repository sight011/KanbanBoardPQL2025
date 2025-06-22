const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireLogin } = require('../middleware/auth');

// Add a reaction to a comment
router.post('/:id/reactions', requireLogin, commentController.addReaction);

// Remove a reaction from a comment
router.delete('/:id/reactions/:reactionId', requireLogin, commentController.removeReaction);

module.exports = router; 