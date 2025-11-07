const prisma = require('../config/db');

module.exports = function requireEnterprise() {
  return async (req, res, next) => {
    try {
      let plan = req.context?.plan || req.user?.plan || req.headers['x-tenant-plan'];

      // If plan is not set, fetch latest subscription for tenant
      if (!plan && req.context?.tenantId) {
        console.log(`[planGuard] Plan not in context, fetching subscription for tenantId=${req.context?.tenantId}`);
        const sub = await prisma.subscription.findFirst({
          where: { tenantId: req.context.tenantId },
          orderBy: { updatedAt: 'desc' },
          select: { plan: true }
        });
        if (!sub) {
          console.log(`[planGuard] Tenant not found`);
          return res.status(404).json({ error: 'Tenant not found' });
        }
        plan = sub.plan;
        // Cache it in context for future use
        if (req.context) {
          req.context.plan = plan;
        }
      }
      
      const planLower = (plan || '').toLowerCase().trim();
      console.log(`[planGuard] tenantId: ${req.context?.tenantId}, plan: "${plan}", planLower: "${planLower}"`);
      const isEnterprise = planLower === 'enterprise_seats' || planLower === 'enterprise_unlimited' || planLower === 'enterprise';
      if (!isEnterprise) {
        console.log(`[planGuard] REJECTING: Not Enterprise plan`);
        return res.status(403).json({ 
          error: 'Enterprise plan required', 
          detail: `This feature requires an Enterprise plan. Your current plan is: ${plan || 'none'}.`,
          code: 'ENTERPRISE_PLAN_REQUIRED',
          currentPlan: plan || 'none'
        });
      }
      next();
    } catch (err) {
      console.error('planGuard error:', err);
      return res.status(500).json({ error: 'Plan check failed', detail: err.message });
    }
  };
};
