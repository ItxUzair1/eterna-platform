const prisma = require('../config/db');

async function getEntitlements(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    plan: sub?.plan || 'individual',
    seatsEntitled: sub?.seatsEntitled || 1,
    storageEntitledGB: sub?.storageEntitledGB || 5,
    lifecycle_state: tenant?.lifecycle_state || 'trial_active',
  };
}

function guard(checkFn) {
  return async (req, res, next) => {
    try {
      const tenantId = Number(req.user?.tenantId || req.body?.tenantId || req.query?.tenantId);
      if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' });
      const ent = await getEntitlements(tenantId);

      if (ent.lifecycle_state === 'trial_expired') {
        return res.status(403).json({ code: 'TRIAL_EXPIRED', message: 'Your trial has ended. Please upgrade.' });
      }

      if (typeof checkFn === 'function') {
        const problem = await checkFn({ entitlements: ent, req });
        if (problem) {
          return res.status(403).json(problem);
        }
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { getEntitlements, guard };


