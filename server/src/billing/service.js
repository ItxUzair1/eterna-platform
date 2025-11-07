require('dotenv').config();
const prisma = require('../config/db');
const Stripe = require('stripe');
const { URL } = require('url');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY in environment. Set it in server/.env');
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

function resolveReturnUrls() {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  // Stripe will replace {CHECKOUT_SESSION_ID} with the actual session ID
  const success = new URL('/billing/success?session_id={CHECKOUT_SESSION_ID}', base).toString();
  const cancel = new URL('/billing/cancel', base).toString();
  return { success, cancel };
}

async function ensureStripeCustomer(tenantId) {
  const latest = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  if (latest?.stripeCustomerId) return latest.stripeCustomerId;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const customer = await getStripe().customers.create({
    name: tenant?.name || `Tenant ${tenantId}`,
    metadata: { tenantId: String(tenantId) },
  });

  await prisma.subscription.create({
    data: {
      tenantId,
      plan: 'individual',
      status: 'trialing',
      stripeCustomerId: customer.id,
    },
  });
  return customer.id;
}

function priceDataForPlan(plan) {
  switch (plan) {
    case 'individual':
      return { unit_amount: 1500, product_data: { name: 'Individual' }, recurring: { interval: 'month' }, currency: 'usd' };
    case 'enterprise_unlimited':
      return { unit_amount: 100000, product_data: { name: 'Enterprise Unlimited' }, recurring: { interval: 'month' }, currency: 'usd' };
    default:
      throw new Error('Unknown plan');
  }
}

async function startCheckout({ tenantId, plan, seats = 1, addons = {} }) {
  const customerId = await ensureStripeCustomer(tenantId);
  const { success, cancel } = resolveReturnUrls();

  const usePriceIds = !!(process.env.PRICE_INDIVIDUAL && process.env.PRICE_ENTERPRISE_SEAT && process.env.PRICE_ENTERPRISE_UNLIMITED);

  const normalizedPlan = (plan === 'enterprise' || plan === 'enterprise_seats') ? 'enterprise_unlimited' : plan;
  const primaryLineItem = usePriceIds
    ? {
        price: normalizedPlan === 'enterprise_unlimited'
          ? process.env.PRICE_ENTERPRISE_UNLIMITED
          : process.env.PRICE_INDIVIDUAL,
        quantity: 1,
      }
    : {
        price_data: priceDataForPlan(normalizedPlan),
        quantity: 1,
      };

  const lineItems = [primaryLineItem];
  if (addons?.storageGB) {
    const storageAddon = usePriceIds && process.env.PRICE_STORAGE_ADDON
      ? { price: process.env.PRICE_STORAGE_ADDON, quantity: Math.max(1, Number(addons.storageGB)) }
      : { price_data: { unit_amount: 100, product_data: { name: 'Storage Addon (per GB)' }, recurring: { interval: 'month' }, currency: 'usd' }, quantity: Math.max(1, Number(addons.storageGB)) };
    lineItems.push(storageAddon);
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: lineItems,
    allow_promotion_codes: true,
    success_url: success,
    cancel_url: cancel,
    // Ensure the resulting Subscription carries our metadata for reliable plan detection
    subscription_data: {
      metadata: { tenantId: String(tenantId), plan }
    },
    metadata: { tenantId: String(tenantId), plan },
  });

  return { url: session.url };
}

async function startPortal({ tenantId }) {
  try {
    const customerId = await ensureStripeCustomer(tenantId);
    const base = process.env.APP_BASE_URL || 'http://localhost:5173';
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: base,
    });
    return { url: session.url };
  } catch (e) {
    if (e.message && e.message.includes('configuration') && e.message.includes('portal')) {
      throw new Error('Stripe Customer Portal is not configured. Please configure it in your Stripe Dashboard: https://dashboard.stripe.com/test/settings/billing/portal (test mode) or https://dashboard.stripe.com/settings/billing/portal (live mode)');
    }
    throw e;
  }
}

async function upsertSubscriptionFromStripe(stripeData) {
  const tenantId = Number(stripeData.metadata?.tenantId || stripeData.metadata?.tenant_id || 0);
  if (!tenantId) return;

  const statusMap = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'past_due',
    unpaid: 'past_due',
  };

  const items = stripeData.items?.data || [];
  const seatsQuantity = items.find(i => i.price?.id === process.env.PRICE_ENTERPRISE_SEAT)?.quantity || 1;
  const storageAddonQty = items.find(i => i.price?.id === process.env.PRICE_STORAGE_ADDON)?.quantity || 0;

  const plan = (() => {
    const primary = items[0]?.price?.id;
    if (primary === process.env.PRICE_ENTERPRISE_SEAT) return 'enterprise_unlimited';
    if (primary === process.env.PRICE_ENTERPRISE_UNLIMITED) return 'enterprise_unlimited';
    if (primary === process.env.PRICE_INDIVIDUAL) return 'individual';
    // Fallback if ad-hoc prices were used: infer from metadata if present
    const metaPlan = (stripeData.metadata?.plan || '').toLowerCase();
    if (metaPlan === 'enterprise' || metaPlan === 'enterprise_seats' || metaPlan === 'enterprise-unlimited' || metaPlan === 'enterprise_unlimited') return 'enterprise_unlimited';
    if (metaPlan === 'individual') return 'individual';
    // Last-resort: infer from unit_amount of the price
    const amount = items[0]?.price?.unit_amount;
    if (amount === 100000) return 'enterprise_unlimited';
    if (amount === 1500) return 'individual';
    return 'individual';
  })();

  const data = {
    tenantId,
    plan,
    status: statusMap[stripeData.status] || 'active',
    stripeCustomerId: stripeData.customer,
    stripeSubId: stripeData.id,
    currentPeriodEnd: stripeData.current_period_end ? new Date(stripeData.current_period_end * 1000) : null,
    seatsEntitled: plan === 'enterprise_unlimited' ? 999 : 1,
    storageEntitledGB: Number(storageAddonQty || 0) + 5,
  };

  const existing = await prisma.subscription.findFirst({
    where: {
      tenantId,
      OR: [
        { stripeSubId: stripeData.id },
        { stripeCustomerId: stripeData.customer }
      ]
    }
  });
  if (existing) {
    await prisma.subscription.update({ where: { id: existing.id }, data });
  } else {
    await prisma.subscription.create({ data });
  }

  if (['active', 'trialing', 'past_due'].includes(data.status)) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { lifecycle_state: 'active' } });
  }
}

async function confirmCheckoutSession({ sessionId }) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['customer', 'subscription', 'subscription.items'] });
  if (!session || session.mode !== 'subscription') return { ok: false };
  const subscription = session.subscription;
  if (!subscription) return { ok: false };
  await upsertSubscriptionFromStripe(subscription);
  return { ok: true };
}

async function reconcileLatestForTenant({ tenantId }) {
  const customerId = await ensureStripeCustomer(tenantId);
  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', expand: ['data.items', 'data.items.data.price'] });
  if (!subs?.data?.length) return { ok: false };
  // Prefer active > trialing > past_due
  const preferredOrder = { active: 3, trialing: 2, past_due: 1, canceled: 0 };
  const best = subs.data.sort((a, b) => (preferredOrder[b.status] || 0) - (preferredOrder[a.status] || 0))[0];
  await upsertSubscriptionFromStripe(best);
  return { ok: true };
}

module.exports = {
  startCheckout,
  startPortal,
  upsertSubscriptionFromStripe,
  confirmCheckoutSession,
  reconcileLatestForTenant,
};


