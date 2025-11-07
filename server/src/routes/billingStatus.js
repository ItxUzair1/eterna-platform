const express = require('express');
const prisma = require('../config/db');
const { getEntitlements } = require('../entitlements/middleware');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/me/billing', verifyToken, async (req, res) => {
  try {
    const tenantId = Number(req.user?.tenantId || req.query?.tenantId || req.body?.tenantId);
    if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' });

    const ent = await getEntitlements(tenantId);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { trial_ends_at: true } });
    const sub = await prisma.subscription.findFirst({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
    const storage = await prisma.storageUsage.findUnique({ where: { tenantId } });
    const users = await prisma.user.count({ where: { tenantId, isActive: true } });

    const rawStatus = sub?.status || 'trialing';
    let status = rawStatus;
    // If we have a subscription and plan is individual, treat as active for UX even if Stripe marks trialing
    if (sub && (ent.plan === 'individual')) {
      status = 'active';
    } else if (rawStatus === 'trialing' && ent.lifecycle_state === 'active') {
      status = 'active';
    }

    res.json({
      plan: ent.plan,
      status,
      // Show subscription period end if present, otherwise show trial end date when still in trial
      currentPeriodEnd: sub?.currentPeriodEnd || tenant?.trial_ends_at || null,
      seats: { used: users, entitled: ent.seatsEntitled },
      storage: { usedGB: storage ? Number(storage.usedBytes) / (1024 ** 3) : 0, entitledGB: ent.storageEntitledGB },
      lifecycle_state: ent.lifecycle_state,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;


