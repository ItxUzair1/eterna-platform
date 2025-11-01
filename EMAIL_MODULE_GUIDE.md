# Email Module Implementation Guide

## Overview

The Email Module (3.7 Core) has been fully implemented with all functional requirements completed. This guide covers configuration, testing, and deployment.

## Functional Requirements Status

✅ **FR-MAIL-1**: SMTP send (Nodemailer) using tenant/team/user credentials stored securely
- Credentials are encrypted using AES-256-CBC
- Encryption key stored in environment variable
- MailAccount management endpoints available

✅ **FR-MAIL-2**: Compose to contact or arbitrary email; use templates with variables
- Mustache templates supported
- Variables: `{{leadName}}`, `{{firstName}}`, `{{company}}`, `{{email}}`, `{{phone}}`
- Compose to any email address

✅ **FR-MAIL-3**: Local Sent/Drafts/Trash maintained in app storage
- All folders stored in PostgreSQL database
- Folder management: move, restore, hard delete

✅ **FR-MAIL-4**: Lead page shortcut: compose from template to lead
- "Compose Email" button in LeadDrawer (when lead has email)
- Automatically populates recipient and lead ID
- Template can be applied via "Apply Template to Lead"

✅ **FR-MAIL-5**: Threading simulated by References/In-Reply-To headers
- Threading via RFC 5322 headers (References, In-Reply-To)
- ThreadId linking in database
- Ready for IMAP merge in Phase 1.1

## Configuration

### 1. Environment Variables

Add to your `.env` file in the `server` directory:

```env
# Email Encryption Key (generate a 64-character hex string)
EMAIL_ENCRYPTION_KEY=your-64-character-hex-key-here

# Other existing variables...
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

**Generate Encryption Key:**
```bash
cd server
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64 characters) and set it as `EMAIL_ENCRYPTION_KEY`.

### 2. Gmail Configuration for Development/Testing

#### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled

#### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select:
   - App: **Mail**
   - Device: **Other (Custom name)** → Enter "Eterna Platform"
3. Click **Generate**
4. Copy the **16-character password** (displayed as `xxxx xxxx xxxx xxxx` - remove spaces when using)

#### Step 3: Configure in Application
1. Navigate to `/dashboard/email-settings` in your app
2. Enter:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: Your Gmail address (e.g., `your-email@gmail.com`)
   - **Password**: The 16-character app password (without spaces)

### 3. Other SMTP Providers

| Provider | Host | Port | Security |
|----------|------|------|----------|
| Gmail | smtp.gmail.com | 587 | TLS |
| Gmail (SSL) | smtp.gmail.com | 465 | SSL |
| Outlook/Hotmail | smtp-mail.outlook.com | 587 | TLS |
| Yahoo | smtp.mail.yahoo.com | 587 | TLS |
| SendGrid | smtp.sendgrid.net | 587 | TLS |
| AWS SES | email-smtp.REGION.amazonaws.com | 587 | TLS |

## API Endpoints

### MailAccount Management

**Create SMTP Account:**
```
POST /api/email/accounts
Body: {
  type: "SMTP",
  host: "smtp.gmail.com",
  port: 587,
  username: "your-email@gmail.com",
  password: "app-password",
  scope: "send"
}
```

**Update SMTP Account:**
```
PUT /api/email/accounts/:id
Body: {
  host: "smtp.gmail.com",
  port: 587,
  username: "your-email@gmail.com",
  password: "new-app-password", // optional, leave blank to keep current
  scope: "send"
}
```

**Get SMTP Account:**
```
GET /api/email/accounts
```

### Email Operations

**Send Email:**
```
POST /api/email/send
Body: {
  to: "recipient@example.com",
  cc: "cc@example.com", // optional
  bcc: "bcc@example.com", // optional
  subject: "Subject",
  bodyHtml: "<p>HTML content</p>",
  bodyText: "Plain text content",
  replyToMessageId: 123, // optional, for threading
  attachments: [] // optional
}
```

**Save Draft:**
```
POST /api/email/drafts
Body: {
  to: "recipient@example.com",
  subject: "Subject",
  bodyHtml: "<p>Content</p>",
  bodyText: "Content"
}
```

**List Sent/Drafts/Trash:**
```
GET /api/email/sent
GET /api/email/drafts
GET /api/email/trash
```

### Templates

**Create/Update Template:**
```
POST /api/email/templates
Body: {
  name: "Welcome Email",
  subject: "Welcome {{firstName}}!",
  body: "<h1>Hello {{leadName}}</h1><p>Welcome to {{company}}!</p>"
}
```

**Preview Template for Lead:**
```
POST /api/email/templates/preview/lead
Body: {
  templateName: "Welcome Email",
  leadId: 123
}
```

## Usage

### 1. First-Time Setup

1. Set `EMAIL_ENCRYPTION_KEY` in `.env`
2. Start your server: `cd server && npm start`
3. Navigate to `/dashboard/email-settings`
4. Configure your SMTP account
5. Test by sending an email from `/dashboard/email`

### 2. Compose Email from Lead Page

1. Go to CRM → Leads
2. Click on a lead to open LeadDrawer
3. If the lead has an email address, click **"✉️ Compose Email to [Name]"**
4. Email compose page opens with recipient pre-filled
5. Select a template and lead ID (already filled), then click **"🎯 Apply Template to Lead"**
6. Customize and send

### 3. Email Templates

Templates support Mustache variables:
- `{{leadName}}` - Full lead name
- `{{firstName}}` - First name only
- `{{company}}` - Company name
- `{{email}}` - Email address
- `{{phone}}` - Phone number

Example template:
```
Subject: Welcome to {{company}}, {{firstName}}!

Body:
<h1>Hello {{leadName}},</h1>
<p>Thank you for your interest in {{company}}.</p>
<p>We'll contact you at {{email}} or {{phone}}.</p>
```

## Deployment

### 1. Pre-Deployment Checklist

- [ ] Generate and set `EMAIL_ENCRYPTION_KEY` in production `.env`
- [ ] Configure production SMTP account
- [ ] Test email sending in staging
- [ ] Verify encryption/decryption works
- [ ] Check database migrations are applied

### 2. Database Migration

```bash
cd server
npx prisma migrate deploy
```

### 3. Environment Setup

Production `.env` should include:
```env
EMAIL_ENCRYPTION_KEY=<production-64-char-hex-key>
DATABASE_URL=<production-database-url>
JWT_SECRET=<production-jwt-secret>
NODE_ENV=production
```

### 4. Server Start

```bash
cd server
npm install
npm start
# Or with PM2:
pm2 start server/src/index.js --name eterna-server
```

### 5. Production SMTP Recommendations

- **Use dedicated SMTP service** (SendGrid, AWS SES, Mailgun) for better deliverability
- **Set up SPF/DKIM** records for your domain
- **Monitor email quotas** and rate limits
- **Implement retry logic** for failed sends (can be added in Phase 1.1)

## Troubleshooting

### Issue: "No SMTP configuration found for this tenant"
**Solution**: Create an SMTP account via `/dashboard/email-settings` or API

### Issue: "Encryption failed"
**Solution**: Check `EMAIL_ENCRYPTION_KEY` is 64 hex characters and set correctly

### Issue: "Authentication failed" (Gmail)
**Solution**: 
- Ensure 2-Step Verification is enabled
- Use App Password (not regular password)
- Check username is full email address

### Issue: "Connection timeout"
**Solution**: 
- Check firewall allows outbound SMTP (port 587/465)
- Verify host and port are correct
- Try SSL (465) instead of TLS (587)

### Issue: Templates not rendering variables
**Solution**: Ensure template uses double curly braces: `{{variableName}}`

## Testing Checklist

- [x] Create SMTP account via UI
- [x] Send test email
- [x] Save draft
- [x] Send draft
- [x] View sent emails
- [x] Move message to trash
- [x] Restore from trash
- [x] Hard delete message
- [x] Create email template
- [x] Apply template to lead
- [x] Compose email from lead page
- [x] Threading with References/In-Reply-To headers

## Security Notes

1. **Encryption Key**: Never commit `EMAIL_ENCRYPTION_KEY` to version control
2. **App Passwords**: Store app passwords securely, rotate periodically
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Consider implementing rate limiting for email endpoints
5. **Validation**: All email addresses are validated before sending

## Next Steps (Phase 1.1)

- [ ] IMAP inbox sync
- [ ] Incoming email threading merge
- [ ] Email attachments handling
- [ ] Email search and filtering
- [ ] Batch email sending
- [ ] Email scheduling
- [ ] Read receipts tracking

---

**Module Status**: ✅ **COMPLETE** - All MVP requirements implemented and tested.

For issues or questions, refer to the code comments or contact the development team.

