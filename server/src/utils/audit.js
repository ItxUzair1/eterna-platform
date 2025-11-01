// utils/audit.js
const prisma = require('../config/db');

function safeJson(value) {
  try { return value ?? null; } catch { return null; }
}

/**
 * ctx: { tenantId, userId, ip?, userAgent? }
 * action: string like 'auth.signin.success', 'permissions.update_user_matrix'
 * targetType: e.g., 'User', 'Role', 'Team', 'Lead', 'Board'
 * targetId: number | null
 * diff: object with minimal fields changed
 */
async function audit(ctx, action, targetType, targetId, diff) {
  try {
    if (!ctx?.tenantId || !ctx?.userId || !action) return;
    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action,
        targetType: targetType || null,
        targetId: targetId ?? null,
        diff: safeJson({
          ...(diff || {}),
          meta: {
            ip: ctx.ip || null,
            ua: ctx.userAgent || null,
            ts: new Date().toISOString()
          }
        })
      }
    });
  } catch (e) {
    // Non-blocking: write to console or a logger; do not throw
    // Replace with structured logger in production
    console.warn('audit_log_failed', { action, targetType, targetId });
  }
}

module.exports = { audit };
