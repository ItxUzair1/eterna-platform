require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const { upsertSubscriptionFromStripe } = require('./service');

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY in environment. Set it in server/.env');
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const stripe = getStripe();
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send('Webhook secret not configured');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscriptionFromStripe(event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed':
        // Optionally store invoice and status changes
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


