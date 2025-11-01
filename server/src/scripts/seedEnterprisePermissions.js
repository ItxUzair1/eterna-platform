// Script to seed admin permissions for Enterprise tenants that don't have them
const prisma = require('../config/db');

async function seedEnterprisePermissions() {
  const enterpriseTenants = await prisma.tenant.findMany({
    where: {
      plan: 'Enterprise'
    },
    select: { id: true, name: true, plan: true }
  });

  console.log(`Found ${enterpriseTenants.length} Enterprise tenant(s)`);

  for (const tenant of enterpriseTenants) {
    // Check if admin permissions already exist
    const existingAdminPerms = await prisma.permission.findMany({
      where: {
        tenantId: tenant.id,
        appKey: 'admin'
      }
    });

    if (existingAdminPerms.length > 0) {
      console.log(`Tenant ${tenant.id} (${tenant.name}) already has admin permissions`);
      continue;
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

    await Promise.all(defaults.map(d =>
      prisma.permission.upsert({
        where: { tenantId_appKey_scopeKey: { tenantId: tenant.id, appKey: d.appKey, scopeKey: d.scopeKey } },
        update: {},
        create: { tenantId: tenant.id, appKey: d.appKey, scopeKey: d.scopeKey }
      })
    ));

    console.log(`✓ Seeded permissions for tenant ${tenant.id} (${tenant.name})`);
  }

  console.log('Done!');
}

seedEnterprisePermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


