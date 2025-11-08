const svc = require('../permissions/permissions.service');
const { createNotification } = require('../../utils/notify');

module.exports = {
  async getUserMatrix(req, res) {
    const data = await svc.getUserMatrix({ tenantId: req.context.tenantId, userId: +req.params.userId });
    res.json(data);
  },
  async updateUserMatrix(req, res) {
    const targetUserId = +req.params.userId;
    const changes = req.body.changes || [];
    const data = await svc.updateUserMatrix({
      tenantId: req.context.tenantId,
      actorId: req.context.userId,
      targetUserId,
      changes
    });
    // Get target user info
    const prisma = require('../../config/db');
    const targetUser = await prisma.user.findUnique({ 
      where: { id: targetUserId }, 
      select: { firstName: true, lastName: true, username: true, email: true } 
    });
    const userName = targetUser?.firstName || targetUser?.username || targetUser?.email || 'User';
    // Notify the user whose permissions were changed
    if (changes.length > 0) {
      await createNotification({
        tenantId: req.context.tenantId,
        userId: targetUserId,
        type: 'info',
        title: 'Permissions updated',
        message: `Your app permissions have been updated.`,
        data: { userId: targetUserId, changesCount: changes.length }
      });
      // Notify the admin who made the change
      if (req.context.userId !== targetUserId) {
        await createNotification({
          tenantId: req.context.tenantId,
          userId: req.context.userId,
          type: 'success',
          title: 'User permissions updated',
          message: `Permissions for ${userName} have been updated.`,
          data: { targetUserId, changesCount: changes.length }
        });
      }
    }
    res.json(data);
  },
  async listRoles(req, res) {
    res.json({ roles: await svc.listRoles({ tenantId: req.context.tenantId }) });
  },
  async createRole(req, res) {
    const { name, description, defaults } = req.body;
    const role = await svc.createRole({ tenantId: req.context.tenantId, actorId: req.context.userId, name, description, defaults });
    await createNotification({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      type: 'success',
      title: 'Role created',
      message: `Role "${name}" has been created successfully.`,
      data: { roleId: role.id, roleName: name }
    });
    res.status(201).json({ role });
  },
  async updateRole(req, res) {
    const { name, description, defaults } = req.body;
    const role = await svc.updateRole({ tenantId: req.context.tenantId, actorId: req.context.userId, roleId: +req.params.roleId, name, description, defaults });
    await createNotification({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      type: 'info',
      title: 'Role updated',
      message: `Role "${name}" has been updated.`,
      data: { roleId: role.id, roleName: name }
    });
    res.json({ role });
  },
  async deleteRole(req, res) {
    const prisma = require('../../config/db');
    const role = await prisma.role.findUnique({ where: { id: +req.params.roleId }, select: { name: true } });
    await svc.deleteRole({ tenantId: req.context.tenantId, actorId: req.context.userId, roleId: +req.params.roleId });
    await createNotification({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      type: 'warning',
      title: 'Role deleted',
      message: `Role "${role?.name || 'Unknown'}" has been deleted.`,
      data: { roleId: +req.params.roleId }
    });
    res.json({ ok: true });
  },
  async getTeamPermissions(req, res) {
    res.json(await svc.getTeamPermissions({ tenantId: req.context.tenantId, teamId: +req.params.teamId }));
  },
  async setTeamPermissions(req, res) {
    const teamId = +req.params.teamId;
    const grants = req.body.grants || [];
    const result = await svc.setTeamPermissions({ tenantId: req.context.tenantId, actorId: req.context.userId, teamId, grants });
    // Get team info
    const prisma = require('../../config/db');
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    if (grants.length > 0) {
      await createNotification({
        tenantId: req.context.tenantId,
        userId: req.context.userId,
        type: 'success',
        title: 'Team permissions updated',
        message: `Permissions for team "${team?.name || 'Unknown'}" have been updated.`,
        data: { teamId, changesCount: grants.length }
      });
    }
    res.json(result);
  },
  async listMembers(req, res) {
    res.json(await svc.listMembers({ tenantId: req.context.tenantId }));
  },
  async listMinimalUsers(req, res) {
    res.json(await svc.listMinimalUsers({ tenantId: req.context.tenantId }));
  },
  async assignRole(req, res) {
    const targetUserId = +req.params.userId;
    const roleId = req.body.roleId;
    const out = await svc.assignRole({ tenantId: req.context.tenantId, actorId: req.context.userId, userId: targetUserId, roleId });
    // Get user and role info
    const prisma = require('../../config/db');
    const [targetUser, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { firstName: true, lastName: true, username: true, email: true } }),
      prisma.role.findUnique({ where: { id: roleId }, select: { name: true } })
    ]);
    const userName = targetUser?.firstName || targetUser?.username || targetUser?.email || 'User';
    // Notify the user whose role was changed
    await createNotification({
      tenantId: req.context.tenantId,
      userId: targetUserId,
      type: 'info',
      title: 'Role assigned',
      message: `You have been assigned the role "${role?.name || 'Unknown'}".`,
      data: { userId: targetUserId, roleId, roleName: role?.name }
    });
    // Notify the admin who assigned the role
    if (req.context.userId !== targetUserId) {
      await createNotification({
        tenantId: req.context.tenantId,
        userId: req.context.userId,
        type: 'success',
        title: 'Role assigned to user',
        message: `${userName} has been assigned the role "${role?.name || 'Unknown'}".`,
        data: { targetUserId, roleId, roleName: role?.name }
      });
    }
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
      // Notify the user whose profile was updated
      await createNotification({
        tenantId: req.context.tenantId,
        userId: +userId,
        type: 'info',
        title: 'Profile updated',
        message: 'Your profile information has been updated.',
        data: { userId: +userId }
      });
      // Notify admin if different user
      if (req.context.userId !== +userId) {
        await createNotification({
          tenantId: req.context.tenantId,
          userId: req.context.userId,
          type: 'success',
          title: 'User profile updated',
          message: `Profile for ${updated.firstName || updated.username || updated.email || 'User'} has been updated.`,
          data: { targetUserId: +userId }
        });
      }
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
      
      const deletedUser = await prisma.user.findUnique({ where: { id: +userId }, select: { firstName: true, lastName: true, username: true, email: true } });
      await prisma.user.delete({ where: { id: +userId } });
      await audit({ tenantId: req.context.tenantId, userId: req.context.userId }, 'permissions.delete_member', 'User', +userId, {});
      await createNotification({
        tenantId: req.context.tenantId,
        userId: req.context.userId,
        type: 'warning',
        title: 'User deleted',
        message: `User ${deletedUser?.firstName || deletedUser?.username || deletedUser?.email || 'Unknown'} has been deleted.`,
        data: { deletedUserId: +userId }
      });
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
