const prisma = require('../config/db');

module.exports = function requireEnterprise() {
  return async (req, res, next) => {
    try {
      let plan = req.context?.plan || req.user?.plan || req.headers['x-tenant-plan'];
      
      // If plan is not set, fetch it from the tenant
      if (!plan && req.context?.tenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: req.context.tenantId },
          select: { plan: true }
        });
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }
        plan = tenant.plan;
        // Cache it in context for future use
        if (req.context) {
          req.context.plan = plan;
        }
      }
      
      const planLower = (plan || '').toLowerCase().trim();
      if (planLower !== 'enterprise') {
        // Only log when actually rejecting (not on every check)
        console.warn(`[planGuard] REJECTING: ${req.method} ${req.path} - Current plan: ${plan || 'none'}, requires Enterprise`);
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
