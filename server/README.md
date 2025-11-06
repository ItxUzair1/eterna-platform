## Billing Setup (Stripe, BullMQ, Prisma)

### Env vars
Set in `.env`:

```
STRIPE_SECRET_KEY=sk_live_or_test
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=http://localhost:5173  # Match your frontend port (Vite default: 5173)
REDIS_URL=redis://localhost:6379

# Price IDs NOT required; using inline price_data in Checkout
```

### Prisma
```
npx prisma migrate dev --schema=prisma/schema.prisma
```

### Seed Stripe (optional)
```
node scripts/seedStripe.js
```

### Start server
```
node src/index.js
```

### Routes
- POST `/api/billing/checkout/start` body: `{ tenantId, plan, seats, addons: { storageGB } }`
- POST `/api/billing/portal` body: `{ tenantId }`
- POST `/api/billing/webhook` (Stripe webhook)

### Local webhook via Stripe CLI
```
stripe listen --forward-to localhost:5000/api/billing/webhook
```

### Trials
Use `startTrialForTenant(tenantId)` from `src/jobs/trialScheduler.js` when creating a tenant.


