const prisma = require('../config/db');

module.exports = function requireEnterprise() {
  return async (req, res, next) => {
    try {
      console.log(`[planGuard] START`);
      let plan = req.context?.plan || req.user?.plan || req.headers['x-tenant-plan'];
      
      // If plan is not set, fetch it from the tenant
      if (!plan && req.context?.tenantId) {
        console.log(`[planGuard] Plan not in context, fetching from DB for tenantId=${req.context?.tenantId}`);
        const tenant = await prisma.tenant.findUnique({
          where: { id: req.context.tenantId },
          select: { plan: true }
        });
        if (!tenant) {
          console.log(`[planGuard] Tenant not found`);
          return res.status(404).json({ error: 'Tenant not found' });
        }
        plan = tenant.plan;
        // Cache it in context for future use
        if (req.context) {
          req.context.plan = plan;
        }
      }
      
      const planLower = (plan || '').toLowerCase().trim();
      console.log(`[planGuard] tenantId: ${req.context?.tenantId}, plan: "${plan}", planLower: "${planLower}"`);
      if (planLower !== 'enterprise') {
        console.log(`[planGuard] REJECTING: Not Enterprise plan`);
        return res.status(403).json({ 
          error: 'Enterprise plan required', 
          detail: `Current plan: ${plan || 'none'}` 
        });
      }
      console.log(`[planGuard] ALLOWING: Enterprise plan confirmed`);
      next();
    } catch (err) {
      console.error('planGuard error:', err);
      return res.status(500).json({ error: 'Plan check failed', detail: err.message });
    }
  };
};
