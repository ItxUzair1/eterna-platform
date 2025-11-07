require('dotenv').config();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

async function main() {
  const existing = await stripe.products.list({ limit: 100 });

  const ensurePrice = async ({ name, interval = 'month', amount, lookupKey }) => {
    let product = existing.data.find(p => p.name === name);
    if (!product) {
      product = await stripe.products.create({ name });
    }
    const prices = await stripe.prices.list({ product: product.id, active: true });
    let price = prices.data.find(p => p.recurring?.interval === interval && p.unit_amount === amount);
    if (!price) {
      price = await stripe.prices.create({ product: product.id, currency: 'usd', unit_amount: amount, recurring: { interval } });
    }
    return price.id;
  };

  const individual = await ensurePrice({ name: 'Individual', amount: 1500 });
  const enterpriseSeat = await ensurePrice({ name: 'Enterprise (per seat)', amount: 3000 });
  const enterpriseUnlimited = await ensurePrice({ name: 'Enterprise Unlimited', amount: 100000 });
  const storageAddon = await ensurePrice({ name: 'Storage Addon (per GB)', amount: 100 });

  console.log('Set these in your .env:');
  console.log('PRICE_INDIVIDUAL=', individual);
  console.log('PRICE_ENTERPRISE_SEAT=', enterpriseSeat);
  console.log('PRICE_ENTERPRISE_UNLIMITED=', enterpriseUnlimited);
  console.log('PRICE_STORAGE_ADDON=', storageAddon);
}

main().catch(e => { console.error(e); process.exit(1); });


