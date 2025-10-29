// Simple memory limiter; replace with Redis/BullMQ in prod
const buckets = new Map();
module.exports = function rateLimiter(keyFn, limit = 5, windowMs = 60_000) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const slot = buckets.get(key)?.filter(t => now - t < windowMs) || [];
    if (slot.length >= limit) return res.status(429).json({ error: 'Too many requests' });
    slot.push(now);
    buckets.set(key, slot);
    next();
  };
};
