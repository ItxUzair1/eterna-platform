require('dotenv').config();
const prisma = require('../src/config/db');
const { trialQueue } = require('../src/jobs/queue');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tenantId = Number(args[1]) || 1;

  if (!command) {
    console.log(`
Usage: node scripts/testBilling.js <command> [tenantId]

Commands:
  status <tenantId>          - Show tenant billing status
  expire-trial <tenantId>    - Set trial to expired (for testing)
  trigger-day30 <tenantId>   - Trigger day 30 job manually
  trigger-day37 <tenantId>   - Trigger day 37 job manually
  trigger-day67 <tenantId>   - Trigger day 67 job manually
  reset-trial <tenantId>     - Reset trial to active (30 days from now)
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'status':
        await showStatus(tenantId);
        break;
      case 'expire-trial':
        await expireTrial(tenantId);
        break;
      case 'trigger-day30':
        await triggerJob('trial_day_30', tenantId);
        break;
      case 'trigger-day37':
        await triggerJob('trial_day_37', tenantId);
        break;
      case 'trigger-day67':
        await triggerJob('trial_day_67', tenantId);
        break;
      case 'reset-trial':
        await resetTrial(tenantId);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function showStatus(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscriptions: { orderBy: { updatedAt: 'desc' }, take: 1 },
      users: { select: { email: true, username: true } },
    },
  });

  if (!tenant) {
    console.error(`Tenant ${tenantId} not found`);
    return;
  }

  console.log('\n=== Tenant Billing Status ===');
  console.log(`ID: ${tenant.id}`);
  console.log(`Name: ${tenant.name}`);
  console.log(`Lifecycle State: ${tenant.lifecycle_state}`);
  console.log(`Trial Started: ${tenant.trial_started_at || 'N/A'}`);
  console.log(`Trial Ends: ${tenant.trial_ends_at || 'N/A'}`);
  if (tenant.trial_ends_at) {
    const daysLeft = Math.ceil((tenant.trial_ends_at - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`Days Left: ${daysLeft > 0 ? daysLeft : 'EXPIRED'}`);
  }
  
  const sub = tenant.subscriptions[0];
  if (sub) {
    console.log(`\nSubscription:`);
    console.log(`  Plan: ${sub.plan}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Seats: ${sub.seatsEntitled}`);
    console.log(`  Storage: ${sub.storageEntitledGB} GB`);
    console.log(`  Period End: ${sub.currentPeriodEnd || 'N/A'}`);
  } else {
    console.log(`\nNo subscription found (trial mode)`);
  }

  console.log(`\nUsers: ${tenant.users.length}`);
  tenant.users.forEach(u => console.log(`  - ${u.email} (${u.username})`));
}

async function expireTrial(tenantId) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      lifecycle_state: 'trial_expired',
    },
  });
  console.log(`✅ Trial expired for tenant ${tenantId}`);
}

async function triggerJob(jobName, tenantId) {
  await trialQueue.add(jobName, { tenantId }, { delay: 0 });
  console.log(`✅ Job ${jobName} queued for tenant ${tenantId}`);
  console.log(`   Check server logs for job execution`);
}

async function resetTrial(tenantId) {
  const now = new Date();
  const ends = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      trial_started_at: now,
      trial_ends_at: ends,
      lifecycle_state: 'trial_active',
    },
  });
  console.log(`✅ Trial reset for tenant ${tenantId}`);
  console.log(`   Trial ends: ${ends.toISOString()}`);
}

main();

