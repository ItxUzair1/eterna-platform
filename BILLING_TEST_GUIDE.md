# Billing System Testing Guide

## Prerequisites

### 1. Environment Setup

**Backend (`server/.env`):**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/eterna?schema=public
STRIPE_SECRET_KEY=sk_test_...  # Get from https://dashboard.stripe.com/test/apikeys
APP_BASE_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379

# SMTP (for email testing)
SMTP_HOST=smtp.gmail.com  # or use Mailtrap for testing
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@eterna.com
```

**Frontend (`client/.env` or `.env.local`):**
```bash
VITE_API_URL=http://localhost:5000/api
```

### 2. Start Services

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Backend
cd eterna-platform/server
npm install
npx prisma migrate dev
npx prisma generate
node src/index.js

# Terminal 3: Start Frontend
cd eterna-platform/client
npm install
npm run dev
```

### 3. Configure Stripe

1. Go to https://dashboard.stripe.com/test/settings/billing/portal
2. Click "Activate test link"
3. Configure settings (optional)
4. Save

---

## Test Scenarios

### Test 1: Signup & Trial Activation

**Steps:**
1. Open http://localhost:5173/register
2. Sign up as Entrepreneur or Enterprise
3. Check email verification link
4. Verify email and login

**Expected Results:**
- ✅ Tenant created with `trial_active` state
- ✅ `trial_started_at` and `trial_ends_at` set (30 days from now)
- ✅ Trial scheduler jobs queued (check Redis/BullMQ)
- ✅ User can access dashboard
- ✅ All content visible, some buttons may show upgrade modal

**Check Database:**
```sql
SELECT id, name, trial_started_at, trial_ends_at, lifecycle_state 
FROM tenants 
WHERE id = <your_tenant_id>;
```

**Check Trial Jobs:**
```bash
# In Redis CLI
redis-cli
KEYS trial:*
```

---

### Test 2: Billing Page Access

**Steps:**
1. Login as Entrepreneur/Enterprise
2. Navigate to `/billing` (or click Billing in sidebar)
3. Check the page loads

**Expected Results:**
- ✅ Billing page shows:
  - Current plan: `individual` (default)
  - Status: `trialing`
  - Trial end date displayed
  - Seats: X / 1
  - Storage: X GB / 5 GB
- ✅ Test mode banner shows test card info
- ✅ "Manage billing" and "Change plan" buttons visible

---

### Test 3: Upgrade Modal Trigger

**Steps:**
1. On billing page, click "Change plan / Add storage"
2. OR try a gated action (should auto-trigger modal)

**Expected Results:**
- ✅ Upgrade modal opens
- ✅ Shows plan options (Individual, Enterprise Seats, Enterprise Unlimited)
- ✅ Seat selector for Enterprise Seats
- ✅ Storage add-on selector
- ✅ "Start Checkout" and "Manage billing" buttons

---

### Test 4: Stripe Checkout Flow

**Steps:**
1. In Upgrade Modal, select a plan (e.g., "Individual")
2. Click "Start Checkout"
3. You'll be redirected to Stripe Checkout page
4. Use test card: `4242 4242 4242 4242`
5. Expiry: Any future date (e.g., 12/25)
6. CVC: Any 3 digits (e.g., 123)
7. ZIP: Any 5 digits (e.g., 12345)
8. Click "Pay"

**Expected Results:**
- ✅ Redirects to Stripe Checkout
- ✅ Payment form loads
- ✅ After payment, redirects to `/billing/success?session_id=cs_test_...`
- ✅ Success page shows "Payment Successful!"
- ✅ Subscription activated in database
- ✅ Auto-redirects to `/billing` after 3 seconds

**Check Database After Payment:**
```sql
SELECT * FROM subscriptions WHERE tenant_id = <your_tenant_id>;
SELECT lifecycle_state FROM tenants WHERE id = <your_tenant_id>;
-- Should show: lifecycle_state = 'active'
```

**Check Stripe Dashboard:**
- Go to https://dashboard.stripe.com/test/payments
- Verify payment succeeded
- Check customer created

---

### Test 5: Customer Portal

**Steps:**
1. On billing page, click "Manage billing"
2. OR in Upgrade Modal, click "Manage billing"

**Expected Results:**
- ✅ Redirects to Stripe Customer Portal
- ✅ Can see subscription details
- ✅ Can update payment method
- ✅ Can cancel subscription
- ✅ Return URL works (redirects back to app)

---

### Test 6: Content Visibility & Feature Gating

**Steps:**
1. Login as trial user
2. Navigate to different apps (CRM, Kanban, Email, etc.)
3. Try clicking premium features/buttons

**Expected Results:**
- ✅ All content visible (read-only)
- ✅ Premium buttons show upgrade modal when clicked
- ✅ 403 error with code (e.g., `UPGRADE_REQUIRED`, `TRIAL_EXPIRED`)
- ✅ Upgrade modal auto-opens with correct message

**Test Gated Actions:**
- Create new item/record
- Export data
- Advanced features
- Team management (if gated)

---

### Test 7: Trial Expiration (Day 30)

**To Test Without Waiting 30 Days:**

**Option A: Manual Database Update**
```sql
-- Set trial_ends_at to past date
UPDATE tenants 
SET trial_ends_at = NOW() - INTERVAL '1 day',
    lifecycle_state = 'trial_expired'
WHERE id = <your_tenant_id>;
```

**Option B: Trigger Job Manually**
```javascript
// In server console or create a test script
const { trialQueue } = require('./src/jobs/queue');
trialQueue.add('trial_day_30', { tenantId: 1 }, { delay: 0 });
```

**Expected Results:**
- ✅ `lifecycle_state` changes to `trial_expired`
- ✅ Email sent (check SMTP inbox or logs)
- ✅ Trial banner shows on frontend
- ✅ Write actions blocked (403 errors)
- ✅ Read access still works

**Check Email:**
- Subject: "Your Eterna Trial Has Ended - Upgrade Required"
- Contains upgrade link
- Professional HTML format

---

### Test 8: Deletion Warning (Day 37)

**To Test Without Waiting:**

```sql
-- Set trial_ends_at to 7 days ago
UPDATE tenants 
SET trial_ends_at = NOW() - INTERVAL '7 days',
    lifecycle_state = 'trial_expired'
WHERE id = <your_tenant_id>;
```

Then trigger job:
```javascript
trialQueue.add('trial_day_37', { tenantId: 1 }, { delay: 0 });
```

**Expected Results:**
- ✅ Warning email sent
- ✅ Email subject: "⚠️ Final Warning: Workspace Will Be Deleted in 30 Days"
- ✅ Email mentions deletion in 1 month
- ✅ Upgrade link in email

---

### Test 9: Pending Deletion (Day 67)

**To Test:**

```sql
-- Set trial_ends_at to 37 days ago
UPDATE tenants 
SET trial_ends_at = NOW() - INTERVAL '37 days',
    lifecycle_state = 'trial_expired'
WHERE id = <your_tenant_id>;
```

Trigger job:
```javascript
trialQueue.add('trial_day_67', { tenantId: 1 }, { delay: 0 });
```

**Expected Results:**
- ✅ `lifecycle_state` changes to `pending_deletion`
- ✅ Audit log entry created
- ✅ Banner shows "Workspace will be deleted soon"

---

### Test 10: Upgrade After Trial Expired

**Steps:**
1. Set tenant to `trial_expired` (see Test 7)
2. Go to `/billing` page
3. Click "Change plan / Add storage"
4. Complete Stripe checkout

**Expected Results:**
- ✅ Can still upgrade after trial expired
- ✅ Subscription activates
- ✅ `lifecycle_state` changes to `active`
- ✅ All features unlock
- ✅ Banner disappears

---

### Test 11: Webhook (Optional)

**If you have webhook secret:**

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks:
   ```bash
   stripe listen --forward-to localhost:5000/api/billing/webhook
   ```
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` in `.env`
5. Complete a test checkout
6. Check webhook received in terminal

**Expected Results:**
- ✅ Webhook events received
- ✅ Subscription updated automatically
- ✅ No need to use confirm endpoint

---

## Quick Test Checklist

- [ ] Signup creates tenant with trial
- [ ] Billing page loads and shows correct data
- [ ] Upgrade modal opens on button click
- [ ] Stripe checkout redirects correctly
- [ ] Payment succeeds and redirects to success page
- [ ] Subscription activated in database
- [ ] Customer Portal works
- [ ] Content visible, buttons gated
- [ ] Upgrade modal shows on gated actions
- [ ] Trial banner shows when expired
- [ ] Email sent on trial expiration
- [ ] Email sent on deletion warning
- [ ] Can upgrade after trial expired
- [ ] Upgraded users have full access

---

## Common Issues & Solutions

### Issue: "Missing STRIPE_SECRET_KEY"
**Solution:** Add `STRIPE_SECRET_KEY=sk_test_...` to `server/.env`

### Issue: "Customer Portal not configured"
**Solution:** Activate portal at https://dashboard.stripe.com/test/settings/billing/portal

### Issue: "Missing tenantId" error
**Solution:** Ensure you're logged in (auth token present)

### Issue: Trial jobs not running
**Solution:** 
- Check Redis is running: `redis-cli ping` (should return PONG)
- Check BullMQ worker started (should see in server logs)

### Issue: Emails not sending
**Solution:**
- Check SMTP credentials in `.env`
- Use Mailtrap for testing: https://mailtrap.io
- Check server logs for SMTP errors

### Issue: 402 Payment Required
**Solution:** Use correct test card: `4242 4242 4242 4242` with any future date

### Issue: Redirects to wrong port
**Solution:** Set `APP_BASE_URL=http://localhost:5173` in `server/.env`

---

## Debugging Tips

**Check Server Logs:**
```bash
# Look for billing-related logs
# [billing] checkout/start - req.user: ...
# [billing] portal - tenantId: ...
```

**Check Database:**
```sql
-- Check tenant state
SELECT id, name, lifecycle_state, trial_started_at, trial_ends_at FROM tenants;

-- Check subscriptions
SELECT * FROM subscriptions;

-- Check audit logs
SELECT * FROM audit_logs WHERE action LIKE '%trial%' OR action LIKE '%deletion%';
```

**Check Redis Queue:**
```bash
redis-cli
KEYS trial:*
LLEN trial:waiting
LLEN trial:active
```

**Check Stripe Dashboard:**
- Payments: https://dashboard.stripe.com/test/payments
- Customers: https://dashboard.stripe.com/test/customers
- Subscriptions: https://dashboard.stripe.com/test/subscriptions

---

## Testing with Stripe CLI

**Listen to webhooks:**
```bash
stripe listen --forward-to localhost:5000/api/billing/webhook
```

**Trigger test events:**
```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

---

## Next Steps After Testing

1. Test with real Stripe account (live mode)
2. Set up production SMTP
3. Configure production Redis
4. Set up monitoring for trial jobs
5. Add analytics for conversion tracking

