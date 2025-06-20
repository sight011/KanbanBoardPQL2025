const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');

// Forgot password - send reset email
router.post('/forgot-password', passwordResetController.forgotPassword);

// Reset password - validate token and update password
router.post('/reset-password', passwordResetController.resetPassword);

// Verify reset token (for frontend validation)
router.get('/verify-token/:token', passwordResetController.verifyResetToken);

// Clean up expired tokens (optional - can be called periodically)
router.delete('/cleanup-tokens', passwordResetController.cleanupExpiredTokens);

module.exports = router; 