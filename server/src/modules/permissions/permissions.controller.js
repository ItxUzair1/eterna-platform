const svc = require('../permissions/permissions.service');

module.exports = {
  async getUserMatrix(req, res) {
    const data = await svc.getUserMatrix({ tenantId: req.context.tenantId, userId: +req.params.userId });
    res.json(data);
  },
  async updateUserMatrix(req, res) {
    const data = await svc.updateUserMatrix({
      tenantId: req.context.tenantId,
      actorId: req.context.userId,
      targetUserId: +req.params.userId,
      changes: req.body.changes || []
    });
    res.json(data);
  },
  async listRoles(req, res) {
    res.json({ roles: await svc.listRoles({ tenantId: req.context.tenantId }) });
  },
  async createRole(req, res) {
    const { name, description, defaults } = req.body;
    const role = await svc.createRole({ tenantId: req.context.tenantId, actorId: req.context.userId, name, description, defaults });
    res.status(201).json({ role });
  },
  async updateRole(req, res) {
    const { name, description, defaults } = req.body;
    const role = await svc.updateRole({ tenantId: req.context.tenantId, actorId: req.context.userId, roleId: +req.params.roleId, name, description, defaults });
    res.json({ role });
  },
  async deleteRole(req, res) {
    await svc.deleteRole({ tenantId: req.context.tenantId, actorId: req.context.userId, roleId: +req.params.roleId });
    res.json({ ok: true });
  },
  async getTeamPermissions(req, res) {
    res.json(await svc.getTeamPermissions({ tenantId: req.context.tenantId, teamId: +req.params.teamId }));
  },
  async setTeamPermissions(req, res) {
    res.json(await svc.setTeamPermissions({ tenantId: req.context.tenantId, actorId: req.context.userId, teamId: +req.params.teamId, grants: req.body.grants || [] }));
  },
  async listMembers(req, res) {
    res.json(await svc.listMembers({ tenantId: req.context.tenantId }));
  },
  async listMinimalUsers(req, res) {
    res.json(await svc.listMinimalUsers({ tenantId: req.context.tenantId }));
  },
  async assignRole(req, res) {
    const out = await svc.assignRole({ tenantId: req.context.tenantId, actorId: req.context.userId, userId: +req.params.userId, roleId: req.body.roleId });
    res.json(out);
  },
  async updateMember(req, res) {
    try {
      const { userId } = req.params;
      const { firstName, lastName, jobTitle, phone, isActive } = req.body;
      
      const prisma = require('../../config/db');
      const { audit } = require('../../utils/audit');
      
      const user = await prisma.user.findFirst({
        where: { id: +userId, tenantId: req.context.tenantId }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const updated = await prisma.user.update({
        where: { id: +userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(jobTitle !== undefined && { jobTitle }),
          ...(phone !== undefined && { phone }),
          ...(isActive !== undefined && { isActive })
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          photo: true,
          phone: true,
          isActive: true,
          role: { select: { id: true, name: true } }
        }
      });
      
      await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'permissions.update_member', 'User', +userId, { firstName, lastName, jobTitle, phone, isActive });
      res.json({ user: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async deleteMember(req, res) {
    try {
      const { userId } = req.params;
      const prisma = require('../../config/db');
      const { audit } = require('../../utils/audit');
      
      const user = await prisma.user.findFirst({
        where: { id: +userId, tenantId: req.context.tenantId }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      // Prevent deleting yourself
      if (+userId === req.context.userId) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }
      
      await prisma.user.delete({ where: { id: +userId } });
      await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'permissions.delete_member', 'User', +userId, {});
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async getMyApps(req, res) {
    res.json(await svc.getMyApps({ tenantId: req.context.tenantId, userId: req.context.userId }));
  },
  async getMyDebug(req, res) {
    const prisma = require('../../config/db');
    const { resolvePermissions } = require('../../middlewares/rbacGuard');
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.context.tenantId },
      select: { id: true, name: true, plan: true }
    });
    
    const permissions = await resolvePermissions({ 
      tenantId: req.context.tenantId, 
      userId: req.context.userId 
    });
    
    const defaultPerms = await prisma.permission.findMany({ 
      where: { tenantId: req.context.tenantId } 
    });
    
    const userPerms = await prisma.userPermission.findMany({
      where: { userId: req.context.userId }
    });
    
    const teamIds = (await prisma.teamMember.findMany({ 
      where: { userId: req.context.userId }, 
      select: { teamId: true } 
    })).map(t => t.teamId);
    
    const teamPerms = teamIds.length
      ? await prisma.teamPermission.findMany({ where: { teamId: { in: teamIds } } })
      : [];
    
    res.json({
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        plan: tenant?.plan,
        planLower: (tenant?.plan || '').toLowerCase().trim()
      },
      user: {
        id: req.context.userId,
        role: permissions.roleName
      },
      permissions: {
        effective: [...permissions.effective],
        enabledApps: permissions.enabledApps,
        tenantDefaults: defaultPerms.map(p => `${p.appKey}:${p.scopeKey}`),
        userPermissions: userPerms.map(p => `${p.appKey}:${p.scopeKey}(${p.enabled})`),
        teamPermissions: teamPerms.map(p => `${p.appKey}:${p.scopeKey}(${p.enabled})`)
      }
    });
  },
  async fixEnterprisePermissions(req, res) {
    const prisma = require('../../config/db');
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.context.tenantId },
      select: { id: true, name: true, plan: true }
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const planLower = (tenant.plan || '').toLowerCase().trim();
    if (planLower !== 'enterprise') {
      return res.status(400).json({ error: 'This endpoint is only for Enterprise tenants' });
    }
    
    // Check if admin permissions already exist
    const existingAdminPerms = await prisma.permission.findMany({
      where: {
        tenantId: tenant.id,
        appKey: 'admin'
      }
    });
    
    if (existingAdminPerms.length > 0) {
      return res.json({ message: 'Admin permissions already exist', permissions: existingAdminPerms });
    }
    
    // Seed admin permissions for Enterprise tenants
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
    
    const created = await Promise.all(defaults.map(d =>
      prisma.permission.upsert({
        where: { tenantId_appKey_scopeKey: { tenantId: tenant.id, appKey: d.appKey, scopeKey: d.scopeKey } },
        update: {},
        create: { tenantId: tenant.id, appKey: d.appKey, scopeKey: d.scopeKey }
      })
    ));
    
    res.json({ message: 'Permissions seeded successfully', permissions: created });
  }
};
