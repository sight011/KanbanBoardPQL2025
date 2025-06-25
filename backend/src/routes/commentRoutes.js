const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireLoginWithCompanyIsolation, enforceCompanyIsolation } = require('../middleware/auth');

// Add a reaction to a comment
router.post('/:id/reactions', requireLoginWithCompanyIsolation, enforceCompanyIsolation, commentController.addReaction);

// Remove a reaction from a comment
router.delete('/:id/reactions/:reactionId', requireLoginWithCompanyIsolation, enforceCompanyIsolation, commentController.removeReaction);

module.exports = router; 