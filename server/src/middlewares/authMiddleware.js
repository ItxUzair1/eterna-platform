// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const verifyToken = async (req, res, next) => {
  try {
    const header = (req.headers.authorization || "").trim();
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      // No Authorization header supplied
      return res.status(401).json({ error: "Missing Authorization header (Bearer token required)" });
    }
    const token = header.slice(7).trim();
    if (!process.env.JWT_SECRET) {
      console.error('[verifyToken] JWT_SECRET missing in environment');
      return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      console.error('[verifyToken] jwt.verify failed:', e && e.message);
      return res.status(401).json({ error: `Invalid token: ${e?.message || 'verification failed'}` });
    }

    if (!decoded || !decoded.id || !decoded.tenantId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, tenantId: true, roleId: true, tokenVersion: true, emailVerifiedAt: true }
    });
    if (!user) {
      console.error(`[verifyToken] user not found: id=${decoded.id}`);
      return res.status(401).json({ error: 'Invalid token: user not found' });
    }
    if (user.tokenVersion !== (decoded.tv ?? 0)) {
      console.error(`[verifyToken] tokenVersion mismatch for user=${decoded.id} (token tv=${decoded.tv ?? 0} db=${user.tokenVersion})`);
      return res.status(401).json({ error: 'Invalid token: token version mismatch' });
    }

    // Load tenant plan for plan guard
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { plan: true }
    });

    req.user = decoded;
    req.context = {
      tenantId: user.tenantId,
      userId: user.id,
      roleId: user.roleId,
      plan: tenant?.plan || null,          // <-- critical for requireEnterprise()
      enabledApps: [],
      permissions: []
    };

    return next();
  } catch (e) {
    console.error('[verifyToken] unexpected error:', e && e.message);
    return res.status(401).json({ error: e?.message || "Invalid token" });
  }
};

const permit = (...roles) => {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.roleId;
      if (!roleId) return res.status(403).json({ error: "Access denied" });
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role || !roles.includes(role.name)) {
        return res.status(403).json({ error: "Access denied" });
      }
      next();
    } catch {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

module.exports = { verifyToken, permit };
