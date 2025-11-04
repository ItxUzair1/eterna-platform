const prisma = require('../config/db');

async function resolvePermissions({ tenantId, userId }) {
  console.log(`[resolvePermissions] START tenantId=${tenantId}, userId=${userId}`);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } }, tenantId: true }
  });

  // Tenant defaults used as role defaults in MVP
  const defaultPerms = await prisma.permission.findMany({ where: { tenantId } });
  console.log(`[resolvePermissions] Found ${defaultPerms.length} default perms`);

  const teamIds = (await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }))
    .map(t => t.teamId);

  const teamPerms = teamIds.length
    ? await prisma.teamPermission.findMany({ where: { teamId: { in: teamIds } } })
    : [];

  const userPerms = await prisma.userPermission.findMany({ where: { userId } });
  console.log(`[resolvePermissions] Found ${userPerms.length} user perms`);

  // If user is in teams with permissions, use ONLY team permissions (restrictive)
  // Otherwise, use tenant defaults
  const hasTeamPermissions = teamPerms.length > 0;
  const merged = new Map();
  
  if (hasTeamPermissions) {
    // Start with empty set, only add team permissions
    teamPerms.forEach(p => { 
      if (p.enabled) merged.set(`${p.appKey}:${p.scopeKey}`, true); 
    });
    console.log(`[resolvePermissions] Using team permissions (restrictive mode): ${merged.size} permissions`);
  } else {
    // Start with tenant defaults
    defaultPerms.forEach(p => merged.set(`${p.appKey}:${p.scopeKey}`, true));
    console.log(`[resolvePermissions] Using tenant defaults: ${merged.size} permissions`);
  }
  
  // Apply user-specific overrides (can add or remove)
  userPerms.forEach(p => {
    const k = `${p.appKey}:${p.scopeKey}`;
    if (p.enabled) merged.set(k, true); else merged.delete(k);
  });

  const effective = new Set([...merged.keys()]);
  const enabledApps = [...new Set([...effective].map(k => k.split(':')[0]))];
  console.log(`[resolvePermissions] enabledApps=${enabledApps.join(', ')}`);

  return { roleName: user?.role?.name || 'Member', effective, enabledApps };
}

const rbacGuard = (appKey, ...scopes) => {
  return async (req, res, next) => {
    try {
      const { tenantId, userId } = req.context || {};
      console.log(`[rbacGuard] START: tenantId=${tenantId}, userId=${userId}, appKey=${appKey}, scopes=${scopes}`);
      if (!tenantId || !userId) return res.status(401).json({ error: 'Unauthorized' });

      // Check if permissions need to be loaded (either undefined, empty array, or empty Set)
      const needsLoad = !req.context.permissions || 
                       (Array.isArray(req.context.permissions) && req.context.permissions.length === 0) ||
                       (req.context.permissions instanceof Set && req.context.permissions.size === 0);
      
      if (needsLoad) {
        console.log(`[rbacGuard] Loading permissions from DB`);
        const r = await resolvePermissions({ tenantId, userId });
        req.context.permissions = r.effective;
        req.context.enabledApps = r.enabledApps;
        req.context.roleName = r.roleName;
      } else {
        console.log(`[rbacGuard] Using cached permissions`);
      }
      
      // Auto-seed Enterprise permissions if missing (for admin app specifically)
      let plan = req.context?.plan;
      if (!plan && tenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { plan: true }
        });
        plan = tenant?.plan || null;
        if (req.context) req.context.plan = plan;
      }
      const planLower = (plan || '').toLowerCase().trim();

      // Individual plan: allow all non-admin apps and scopes (read/write). Block admin.
      if (planLower === 'individual') {
        if (appKey === 'admin') {
          console.log('[rbacGuard] REJECTING: Admin not available on Individual plan');
          return res.status(403).json({ error: 'Admin app not available on Individual plan' });
        }
        console.log('[rbacGuard] ALLOWING: Individual plan grants full RW for non-admin apps');
        return next();
      }
      if (planLower === 'enterprise' && appKey === 'admin' && !req.context.enabledApps.includes(appKey)) {
        // Check if admin permissions exist in DB
        const existingAdminPerms = await prisma.permission.findMany({
          where: { tenantId, appKey: 'admin' }
        });
        
        if (existingAdminPerms.length === 0) {
          // Auto-seed all Enterprise permissions for first-time admin access
          const defaults = [
            { appKey: 'admin', scopeKey: 'read' },
            { appKey: 'admin', scopeKey: 'manage' },
            { appKey: 'crm', scopeKey: 'read' },
            { appKey: 'kanban', scopeKey: 'read' },
            { appKey: 'email', scopeKey: 'read' },
            { appKey: 'money', scopeKey: 'read' },
            { appKey: 'todos', scopeKey: 'read' },
            { appKey: 'files', scopeKey: 'read' }
          ];
          
          await Promise.all(defaults.map(d =>
            prisma.permission.upsert({
              where: { tenantId_appKey_scopeKey: { tenantId, appKey: d.appKey, scopeKey: d.scopeKey } },
              update: {},
              create: { tenantId, appKey: d.appKey, scopeKey: d.scopeKey }
            })
          ));
          
          // Reload permissions after seeding
          const r = await resolvePermissions({ tenantId, userId });
          req.context.permissions = r.effective;
          req.context.enabledApps = r.enabledApps;
          req.context.roleName = r.roleName;
        }
      }
      
      console.log(`[rbacGuard] enabledApps: ${req.context.enabledApps.join(', ')}, checking appKey: ${appKey}`);
      if (!req.context.enabledApps.includes(appKey)) {
        console.log(`[rbacGuard] REJECTING: App '${appKey}' not in enabledApps`);
        return res.status(403).json({ 
          error: 'App disabled for user',
          detail: `App '${appKey}' is not enabled. Enabled apps: ${req.context.enabledApps.join(', ')}`
        });
      }

      const ok = scopes.length === 0 || scopes.some(s => req.context.permissions.has(`${appKey}:${s}`));
      console.log(`[rbacGuard] checking scopes: ${scopes.map(s => `${appKey}:${s}`).join(', ')}, ok=${ok}`);
      if (!ok) {
        const required = scopes.map(s => `${appKey}:${s}`).join(' or ');
        const hasPermissions = [...req.context.permissions].filter(p => p.startsWith(`${appKey}:`));
        console.log(`[rbacGuard] REJECTING: Insufficient permission. Required: ${required}, hasPermissions: ${hasPermissions.join(', ')}`);
        return res.status(403).json({ 
          error: 'Insufficient permission',
          detail: `Required: ${required}`,
          enabledApps: req.context.enabledApps,
          hasApp: req.context.enabledApps.includes(appKey),
          userPermissions: hasPermissions,
          roleName: req.context.roleName
        });
      }
      
      console.log(`[rbacGuard] ALLOWING request`);
      return next();
    } catch (err) {
      console.error('RBAC evaluation error:', err);
      return res.status(500).json({ error: 'RBAC evaluation failed', detail: err.message });
    }
  };
};

module.exports = { rbacGuard, resolvePermissions };
