const prisma = require("../config/db");

async function audit(ctx, action, targetType, targetId, diff) {
  try {
    if (!ctx?.tenantId || !ctx?.userId) return;
    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action,
        targetType,
        targetId: targetId ?? null,
        diff: diff ? JSON.stringify(diff) : null,
      },
    });
  } catch {
    // swallow to avoid breaking the request path
  }
}

module.exports = { audit };
