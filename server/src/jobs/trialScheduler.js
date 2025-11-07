const prisma = require('../config/db');
const { trialQueue, Worker, connection } = require('./queue');
const nodemailer = require('nodemailer');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function startTrialForTenant(tenantId) {
  // Get tenant to use existing trial dates (already set during creation)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { trial_started_at: true, trial_ends_at: true },
  });

  if (!tenant) {
    console.error(`[trialScheduler] Tenant ${tenantId} not found`);
    return;
  }

  // If trial dates not set, set them now (fallback for manual calls)
  if (!tenant.trial_started_at || !tenant.trial_ends_at) {
    const now = new Date();
    const ends = daysFromNow(30);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { trial_started_at: now, trial_ends_at: ends, lifecycle_state: 'trial_active' },
    });
    await scheduleTrialJobs(tenantId, now, ends);
  } else {
    // Use existing dates to schedule jobs
    await scheduleTrialJobs(tenantId, tenant.trial_started_at, tenant.trial_ends_at);
  }
}

async function scheduleTrialJobs(tenantId, startedAt, endsAt) {
  const day30 = endsAt; // Day 30: Trial ends
  const day37 = new Date(endsAt.getTime() + 7 * 24 * 60 * 60 * 1000); // Day 37: 1 week warning
  const day67 = new Date(endsAt.getTime() + 37 * 24 * 60 * 60 * 1000); // Day 67: Set for deletion (1 month after warning)

  await trialQueue.add('trial_day_30', { tenantId }, { delay: Math.max(0, day30.getTime() - Date.now()) });
  await trialQueue.add('trial_day_37', { tenantId }, { delay: Math.max(0, day37.getTime() - Date.now()) });
  await trialQueue.add('trial_day_67', { tenantId }, { delay: Math.max(0, day67.getTime() - Date.now()) });
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail(to, subject, html) {
  const t = transporter();
  await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to, subject, html });
}

async function sendTrialEndedEmail(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const users = await prisma.user.findMany({ where: { tenantId } });
  const emails = users.map(u => u.email).filter(Boolean);
  if (!emails.length) return;
  
  const upgradeUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/billing`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your 30-Day Trial Has Ended</h2>
      <p>Hello ${tenant?.name || 'there'},</p>
      <p>Your free trial period has ended. To continue using Eterna Platform and access all features, please upgrade to a paid plan.</p>
      <p>If you don't upgrade, your workspace will be scheduled for deletion. You have 7 days to upgrade before the deletion warning email is sent.</p>
      <div style="margin: 30px 0;">
        <a href="${upgradeUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upgrade Now</a>
      </div>
      <p>Thank you for trying Eterna Platform!</p>
    </div>
  `;
  await sendEmail(emails.join(','), 'Your Eterna Trial Has Ended - Upgrade Required', html);
}

async function sendDeletionWarningEmail(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const users = await prisma.user.findMany({ where: { tenantId } });
  const emails = users.map(u => u.email).filter(Boolean);
  if (!emails.length) return;
  
  const upgradeUrl = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/billing`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #DC2626;">⚠️ Important: Workspace Deletion Warning</h2>
      <p>Hello ${tenant?.name || 'there'},</p>
      <p><strong>Your workspace will be deleted in 1 month (30 days) if you don't upgrade.</strong></p>
      <p>This is your final warning. After 30 days, your workspace and all data will be permanently deleted and cannot be recovered.</p>
      <p>To prevent deletion and continue using Eterna Platform, please upgrade to a paid plan now.</p>
      <div style="margin: 30px 0;">
        <a href="${upgradeUrl}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Upgrade to Save Your Workspace</a>
      </div>
      <p style="color: #DC2626;"><strong>Action Required:</strong> Upgrade within 30 days to avoid permanent data loss.</p>
    </div>
  `;
  await sendEmail(emails.join(','), '⚠️ Final Warning: Workspace Will Be Deleted in 30 Days', html);
}

new Worker('trial', async job => {
  const { tenantId } = job.data;
  if (job.name === 'trial_day_30') {
    const sub = await prisma.subscription.findFirst({ where: { tenantId, status: 'active' } });
    if (!sub) {
      await prisma.tenant.update({ where: { id: tenantId }, data: { lifecycle_state: 'trial_expired' } });
      await sendTrialEndedEmail(tenantId);
      await prisma.auditLog.create({
        data: { tenantId, actorId: 0, action: 'trial_expired', targetType: 'Tenant', targetId: tenantId, diff: { to: 'trial_expired' } },
      });
    }
  }
  if (job.name === 'trial_day_37') {
    // Send 1 week warning email (1 month before deletion)
    await sendDeletionWarningEmail(tenantId);
    await prisma.auditLog.create({
      data: { tenantId, actorId: 0, action: 'deletion_warning_sent', targetType: 'Tenant', targetId: tenantId },
    });
  }
  if (job.name === 'trial_day_67') {
    // Set for deletion (1 month after warning, 37 days after trial end)
    await prisma.tenant.update({ where: { id: tenantId }, data: { lifecycle_state: 'pending_deletion' } });
    await prisma.auditLog.create({
      data: { tenantId, actorId: 0, action: 'pending_deletion', targetType: 'Tenant', targetId: tenantId, diff: { to: 'pending_deletion', reason: 'Trial expired and 30-day grace period ended' } },
    });
  }
}, { connection });

module.exports = { startTrialForTenant, scheduleTrialJobs };


