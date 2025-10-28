// Later: check req.context.permissions against { appKey, scopeKey }
function ensureScope(ctx, appKey, scopeKey) {
  // TEMP: allow all authenticated users. Replace when RBAC is ready.
  if (!ctx?.tenantId || !ctx?.userId) {
    const e = new Error("Unauthorized");
    e.status = 401;
    throw e;
  }
  return true;
}

module.exports = { ensureScope };
