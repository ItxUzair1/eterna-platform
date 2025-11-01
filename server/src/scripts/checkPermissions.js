// Quick script to check permissions for a specific tenant/user
const prisma = require('../config/db');

async function checkPermissions() {
  const tenantId = process.argv[2] ? parseInt(process.argv[2]) : null;
  
  if (!tenantId) {
    console.log('Usage: node checkPermissions.js <tenantId>');
    console.log('Finding all Enterprise tenants...');
    const tenants = await prisma.tenant.findMany({
      where: { plan: 'Enterprise' },
      select: { id: true, name: true, plan: true }
    });
    console.log('Enterprise tenants:', tenants);
    if (tenants.length > 0) {
      console.log(`\nRun: node checkPermissions.js ${tenants[0].id}`);
    }
    process.exit(0);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, plan: true }
  });

  if (!tenant) {
    console.log('Tenant not found');
    process.exit(1);
  }

  console.log(`\nTenant: ${tenant.name} (ID: ${tenant.id}, Plan: ${tenant.plan})`);
  
  const permissions = await prisma.permission.findMany({
    where: { tenantId }
  });

  console.log(`\nPermissions (${permissions.length}):`);
  permissions.forEach(p => {
    console.log(`  - ${p.appKey}:${p.scopeKey}`);
  });

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, username: true }
  });

  console.log(`\nUsers (${users.length}):`);
  for (const user of users) {
    const userPerms = await prisma.userPermission.findMany({
      where: { userId: user.id }
    });
    console.log(`  - ${user.email} (ID: ${user.id})`);
    if (userPerms.length > 0) {
      console.log(`    User permissions: ${userPerms.map(p => `${p.appKey}:${p.scopeKey}(${p.enabled})`).join(', ')}`);
    }
  }
}

checkPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


