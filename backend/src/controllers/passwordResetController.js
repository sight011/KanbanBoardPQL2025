const pool = require('../db');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Configure SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey && sendgridApiKey.startsWith('SG.')) {
    sgMail.setApiKey(sendgridApiKey);
} else {
    console.warn('⚠️ SendGrid API Key is not configured correctly. Password reset emails will not be sent.');
    console.warn('   Please set SENDGRID_API_KEY in your .env file.');
}

const passwordResetController = {
    // Forgot password - send reset email
    forgotPassword: async (req, res) => {
        console.log('🔍 forgotPassword endpoint hit');
        
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    error: 'Email is required',
                    message: 'Please provide an email address'
                });
            }

            // Check if user exists
            const userResult = await pool.query(
                'SELECT id, username, email FROM users WHERE email = $1',
                [email]
            );

            if (userResult.rows.length === 0) {
                // Don't reveal if email exists or not for security
                console.log('📧 Password reset requested for non-existent email:', email);
                return res.status(200).json({
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }

            const user = userResult.rows[0];

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            // Store reset token in database
            await pool.query(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, resetToken, expiresAt]
            );

            // Create reset URL
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

            // Email content
            const emailContent = {
                to: user.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourkanbanapp.com',
                subject: 'Password Reset Request - Kanban Board',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>Hello ${user.username},</p>
                        <p>You requested a password reset for your Kanban Board account.</p>
                        <p>Click the button below to reset your password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #007bff; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request this password reset, please ignore this email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            This is an automated message from your Kanban Board application.
                        </p>
                    </div>
                `
            };

            // Send email only if API key is set
            if (sendgridApiKey && sendgridApiKey.startsWith('SG.')) {
                await sgMail.send(emailContent);
                console.log('✅ Password reset email sent to:', user.email);
            } else {
                console.log('🚫 Skipping email send: SendGrid API Key not configured.');
                console.log('   Reset URL for testing:', resetUrl);
            }
            
            res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });

        } catch (err) {
            console.error('❌ Error in forgotPassword:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({
                error: 'Server error',
                message: 'Failed to process password reset request'
            });
        }
    },

    // Reset password - validate token and update password
    resetPassword: async (req, res) => {
        console.log('🔍 resetPassword endpoint hit');
        
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Token and new password are required'
                });
            }

            // Validate password strength
            if (newPassword.length < 6) {
                return res.status(400).json({
                    error: 'Password too short',
                    message: 'Password must be at least 6 characters long'
                });
            }

            // Find valid reset token
            const tokenResult = await pool.query(
                `SELECT prt.*, u.email, u.username 
                 FROM password_reset_tokens prt 
                 JOIN users u ON prt.user_id = u.id 
                 WHERE prt.token = $1 
                 AND prt.expires_at > NOW() 
                 AND prt.used_at IS NULL`,
                [token]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid or expired token',
                    message: 'The password reset token is invalid or has expired'
                });
            }

            const resetToken = tokenResult.rows[0];

            // Hash new password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            // Update user password and mark token as used
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Update user password
                await client.query(
                    'UPDATE users SET password_hash = $1 WHERE id = $2',
                    [hashedPassword, resetToken.user_id]
                );

                // Mark token as used
                await client.query(
                    'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
                    [resetToken.id]
                );

                await client.query('COMMIT');

                console.log('✅ Password reset successful for user:', resetToken.email);
                res.status(200).json({
                    success: true,
                    message: 'Password has been reset successfully'
                });

            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }

        } catch (err) {
            console.error('❌ Error in resetPassword:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({
                error: 'Server error',
                message: 'Failed to reset password'
            });
        }
    },

    // Verify reset token (for frontend validation)
    verifyResetToken: async (req, res) => {
        console.log('🔍 verifyResetToken endpoint hit');
        
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    error: 'Token is required',
                    message: 'Please provide a reset token'
                });
            }

            // Check if token is valid and not expired
            const tokenResult = await pool.query(
                `SELECT prt.*, u.email 
                 FROM password_reset_tokens prt 
                 JOIN users u ON prt.user_id = u.id 
                 WHERE prt.token = $1 
                 AND prt.expires_at > NOW() 
                 AND prt.used_at IS NULL`,
                [token]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid or expired token',
                    message: 'The password reset token is invalid or has expired'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Token is valid',
                email: tokenResult.rows[0].email
            });

        } catch (err) {
            console.error('❌ Error in verifyResetToken:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({
                error: 'Server error',
                message: 'Failed to verify token'
            });
        }
    },

    // Clean up expired tokens (can be run periodically)
    cleanupExpiredTokens: async (req, res) => {
        console.log('🔍 cleanupExpiredTokens endpoint hit');
        
        try {
            const result = await pool.query(
                'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL'
            );

            console.log('✅ Cleaned up expired tokens:', result.rowCount);
            res.status(200).json({
                success: true,
                message: `Cleaned up ${result.rowCount} expired tokens`
            });

        } catch (err) {
            console.error('❌ Error in cleanupExpiredTokens:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({
                error: 'Server error',
                message: 'Failed to cleanup expired tokens'
            });
        }
    }
};

module.exports = passwordResetController; 