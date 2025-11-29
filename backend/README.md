# Backend Setup

## Email service configuration
The email features (password reset links, weekly updates, and other notifications) require SMTP credentials. If they are missing you will see the warning `Email disabled: missing SMTP credentials (SMTP_HOST/SMTP_USER/SMTP_PASS)` on startup and messages will only be logged to the console.

1. Create a `.env` file in `backend/` (or add to your existing one) with the following variables:
   ```ini
   SMTP_HOST=smtp.yourprovider.com
   SMTP_PORT=587
   SMTP_SECURE=false # set to true when using port 465
   SMTP_USER=your_smtp_username
   SMTP_PASS=your_smtp_password
   MAIL_FROM="SparkHub <noreply@sparkhub.dev>"
   FRONTEND_URL=http://localhost:3000
   # Optional: custom logo URL for transactional emails (defaults to an inline SparkHub badge)
   EMAIL_LOGO_URL=https://yourcdn.com/sparkhub-logo.png
   ```
2. Restart the backend server so it picks up the new variables.
3. Check the server logs for `Email disabled` disappearing. Password reset and weekly update emails will now send via your SMTP provider.

> Tip: For local development, you can use a test SMTP service (e.g., Mailtrap) and plug in the credentials it provides. New signups will receive a verification email that includes both a button and a 6-digit code.
