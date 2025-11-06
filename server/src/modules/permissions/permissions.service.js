const prisma = require('../../config/db');
const { audit } = require('../../utils/audit');
const { getEntitlements } = require('../../entitlements/middleware');

const APPS = ['crm','kanban','email','money','todos','admin','files','notifications'];
const SCOPES = ['read','write','manage'];

function normalize(matrixRows) {
  const m = {};
  for (const a of APPS) { m[a] = {}; for (const s of SCOPES) m[a][s] = false; }
  matrixRows.forEach(r => { if (m[r.appKey]) m[r.appKey][r.scopeKey] = !!r.enabled; });
  return m;
}

async function getUserMatrix({ tenantId, userId }) {
  // For Individual plan, grant read/write to all apps by default
  const ent = await getEntitlements(tenantId);
  const planLower = (ent?.plan || '').toLowerCase().trim();
  if (planLower === 'individual') {
    const nonAdminApps = APPS.filter(a => a !== 'admin');
    const matrix = normalize(nonAdminApps.flatMap(a => ([
      { appKey: a, scopeKey: 'read', enabled: true },
      { appKey: a, scopeKey: 'write', enabled: true }
    ])));
    const enabledApps = [...nonAdminApps];
    return { matrix, enabledApps };
  }

  const defaults = await prisma.permission.findMany({ where: { tenantId } });
  const teamIds = (await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } })).map(x => x.teamId);
  const team = teamIds.length ? await prisma.teamPermission.findMany({ where: { teamId: { in: teamIds } } }) : [];
  const user = await prisma.userPermission.findMany({ where: { userId } });

  // If user is in teams with permissions, use ONLY team permissions (restrictive)
  // Otherwise, use tenant defaults
  const hasTeamPermissions = team.length > 0;
  const grants = new Map();
  
  if (hasTeamPermissions) {
    // Start with empty set, only add team permissions
    team.forEach(p => { 
      if (p.enabled) grants.set(`${p.appKey}:${p.scopeKey}`, true); 
    });
  } else {
    // Start with tenant defaults
    defaults.forEach(p => grants.set(`${p.appKey}:${p.scopeKey}`, true));
  }
  
  // Apply user-specific overrides (can add or remove)
  user.forEach(p => { const k = `${p.appKey}:${p.scopeKey}`; if (p.enabled) grants.set(k, true); else grants.delete(k); });

  const effRows = [...grants.keys()].map(k => { const [appKey, scopeKey] = k.split(':'); return { appKey, scopeKey, enabled: true }; });
  const matrix = normalize(effRows);
  const enabledApps = Object.keys(matrix).filter(a => SCOPES.some(s => matrix[a][s]));
  return { matrix, enabledApps };
}

async function updateUserMatrix({ tenantId, actorId, targetUserId, changes }) {
  await prisma.$transaction(changes
    .filter(c => APPS.includes(c.appKey) && SCOPES.includes(c.scopeKey))
    .map(c => prisma.userPermission.upsert({
      where: { userId_appKey_scopeKey: { userId: targetUserId, appKey: c.appKey, scopeKey: c.scopeKey } },
      update: { enabled: !!c.enabled },
      create: { userId: targetUserId, appKey: c.appKey, scopeKey: c.scopeKey, enabled: !!c.enabled }
    }))
  );
  await audit({ tenantId, userId: actorId }, 'permissions.update_user_matrix', 'User', targetUserId, { changes });
  return getUserMatrix({ tenantId, userId: targetUserId });
}

async function listRoles({ tenantId }) {
  return prisma.role.findMany({ where: { tenantId }, orderBy: { id: 'asc' } });
}

async function createRole({ tenantId, actorId, name, description, defaults }) {
  const role = await prisma.role.create({ data: { tenantId, name, description } });
  if (Array.isArray(defaults)) {
    await prisma.$transaction(defaults
      .filter(d => APPS.includes(d.appKey) && SCOPES.includes(d.scopeKey))
      .map(d => prisma.permission.upsert({
        where: { tenantId_appKey_scopeKey: { tenantId, appKey: d.appKey, scopeKey: d.scopeKey } },
        update: {},
        create: { tenantId, appKey: d.appKey, scopeKey: d.scopeKey }
      })));
  }
  await audit({ tenantId, userId: actorId }, 'permissions.create_role', 'Role', role.id, { name, description, defaults });
  return role;
}

async function updateRole({ tenantId, actorId, roleId, name, description, defaults }) {
  const role = await prisma.role.update({ where: { id: roleId }, data: { name, description } });
  if (Array.isArray(defaults)) {
    await prisma.$transaction(defaults
      .filter(d => APPS.includes(d.appKey) && SCOPES.includes(d.scopeKey))
      .map(d => prisma.permission.upsert({
        where: { tenantId_appKey_scopeKey: { tenantId, appKey: d.appKey, scopeKey: d.scopeKey } },
        update: {},
        create: { tenantId, appKey: d.appKey, scopeKey: d.scopeKey }
      })));
  }
  await audit({ tenantId, userId: actorId }, 'permissions.update_role', 'Role', role.id, { name, description, defaults });
  return role;
}

async function deleteRole({ tenantId, actorId, roleId }) {
  await prisma.role.delete({ where: { id: roleId } });
  await audit({ tenantId, userId: actorId }, 'permissions.delete_role', 'Role', roleId, {});
}

async function getTeamPermissions({ tenantId, teamId }) {
  const team = await prisma.team.findFirst({ where: { id: teamId, tenantId }, select: { id: true } });
  if (!team) throw new Error('Team not found');
  const rows = await prisma.teamPermission.findMany({ where: { teamId } });
  return { matrix: normalize(rows.map(r => ({ appKey: r.appKey, scopeKey: r.scopeKey, enabled: r.enabled }))) };
}

async function setTeamPermissions({ tenantId, actorId, teamId, grants }) {
  const team = await prisma.team.findFirst({ where: { id: teamId, tenantId } });
  if (!team) throw new Error('Team not found');
  await prisma.$transaction(grants
    .filter(g => APPS.includes(g.appKey) && SCOPES.includes(g.scopeKey))
    .map(g => prisma.teamPermission.upsert({
      where: { teamId_appKey_scopeKey: { teamId, appKey: g.appKey, scopeKey: g.scopeKey } },
      update: { enabled: !!g.enabled },
      create: { teamId, appKey: g.appKey, scopeKey: g.scopeKey, enabled: !!g.enabled }
    })));
  await audit({ tenantId, userId: actorId }, 'permissions.set_team_permissions', 'Team', teamId, { grants });
  return getTeamPermissions({ tenantId, teamId });
}

async function listMembers({ tenantId }) {
  const users = await prisma.user.findMany({
    where: { tenantId },
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
      createdAt: true,
      role: { select: { id: true, name: true } },
      teams: {
        include: {
          team: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return { users };
}

async function assignRole({ tenantId, actorId, userId, roleId }) {
  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId } });
  if (!role) throw new Error('Role not found');
  const user = await prisma.user.update({ where: { id: userId }, data: { roleId } });
  await audit({ tenantId, userId: actorId }, 'permissions.assign_role', 'User', userId, { roleId });
  return { userId: user.id, role: { id: role.id, name: role.name } };
}

async function getMyApps({ tenantId, userId }) {
  const m = await getUserMatrix({ tenantId, userId });
  return { apps: m.enabledApps, perms: m.matrix };
}

module.exports = {
  getUserMatrix, updateUserMatrix,
  listRoles, createRole, updateRole, deleteRole,
  getTeamPermissions, setTeamPermissions,
  listMembers, assignRole,
  getMyApps
};
