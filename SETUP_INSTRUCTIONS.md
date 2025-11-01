# Quick Setup Instructions for Email Module

## Issue: "No SMTP configuration found for this tenant"

This error means you haven't configured your email account yet. Follow these steps:

## Step 1: Generate Encryption Key (One-time setup)

1. Open terminal/command prompt in the `server` directory
2. Run:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Copy the output (64-character string)
4. Add to `server/.env` file:
   ```env
   EMAIL_ENCRYPTION_KEY=your-64-character-hex-string-here
   ```
5. Restart your server

## Step 2: Configure Gmail SMTP Account

### For Gmail (mudasirmujtaba15@gmail.com):

1. **Enable 2-Step Verification**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and device "Other (Custom name)" → Enter "Eterna Platform"
   - Click "Generate"
   - Copy the **16-character password** (will look like `abcd efgh ijkl mnop` - remove spaces when using)

3. **Configure in Application**:
   - In your app, go to: `/dashboard/email-settings`
   - Or click the **⚙️ Settings** button in the Email page
   - Enter:
     - **Host**: `smtp.gmail.com`
     - **Port**: `587`
     - **Username**: `mudasirmujtaba15@gmail.com`
     - **Password**: The 16-character app password (without spaces)
   - Click "Create SMTP Account"

## Step 3: Test

1. Go to `/dashboard/email`
2. Compose an email
3. Click "Send"

## Alternative: Direct URL

You can also navigate directly to:
```
http://localhost:YOUR_PORT/dashboard/email-settings
```

## Troubleshooting

**If you still get errors:**
1. Make sure `EMAIL_ENCRYPTION_KEY` is set in `server/.env`
2. Make sure you restarted the server after adding the key
3. Verify the Gmail app password is correct (16 characters, no spaces)
4. Check that 2-Step Verification is enabled on your Google account

**Quick Test Command:**
```bash
# Check if encryption key is set
cd server
node -e "console.log('Key set:', !!process.env.EMAIL_ENCRYPTION_KEY)"
```

