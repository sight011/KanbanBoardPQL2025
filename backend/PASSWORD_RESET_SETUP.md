# Password Reset Setup Guide

## Overview
This guide will help you set up password reset functionality using SendGrid for email delivery.

## Prerequisites
- SendGrid account (free tier available)
- Environment variables configured

## SendGrid Setup

### 1. Create SendGrid Account
1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key
1. In SendGrid dashboard, go to **Settings > API Keys**
2. Click **Create API Key**
3. Choose **Restricted Access** and select **Mail Send**
4. Copy the generated API key

### 3. Verify Sender Email (Optional but Recommended)
1. Go to **Settings > Sender Authentication**
2. Verify your domain or at least verify a single sender email
3. This improves email deliverability

## Environment Variables

Add these to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourkanbanapp.com

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173
```

## Database Migration

The password reset functionality requires a new table. Run the migration:

```bash
node src/db/runPasswordResetMigration.js
```

## API Endpoints

### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Body**: `{ "email": "user@example.com" }`
- **Response**: Success message (doesn't reveal if email exists)

### Reset Password
- **POST** `/api/auth/reset-password`
- **Body**: `{ "token": "reset_token", "newPassword": "new_password" }`
- **Response**: Success message

### Verify Token
- **GET** `/api/auth/verify-token/:token`
- **Response**: Token validity and user email

## Frontend Routes

- `/forgot-password` - Request password reset
- `/reset-password?token=xxx` - Reset password with token

## Testing

1. Start your backend server
2. Start your frontend server
3. Go to login page and click "Forgot Password"
4. Enter an email address
5. Check your email for the reset link
6. Click the link and set a new password

## Security Features

- Tokens expire after 1 hour
- Tokens can only be used once
- Passwords must be at least 6 characters
- Email addresses are not revealed if they don't exist
- All tokens are stored securely in the database

## Troubleshooting

### Emails not sending
- Check your SendGrid API key
- Verify your sender email is authenticated
- Check SendGrid dashboard for delivery status

### Reset links not working
- Ensure `FRONTEND_URL` is set correctly
- Check that the token is valid and not expired
- Verify the database migration ran successfully

### Frontend routing issues
- Make sure React Router is properly configured
- Check that all components are imported correctly 