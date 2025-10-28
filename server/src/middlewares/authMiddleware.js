const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const verifyToken = (req, res, next) => {
  try {
    const header = (req.headers.authorization || "").trim();
    if (!header?.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }
    const token = header.slice(7).trim();
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id || !decoded?.tenantId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }
    req.user = decoded;
    req.context = {
      tenantId: decoded.tenantId,
      userId: decoded.id,
      roleId: decoded.roleId || null,
      // placeholders for future:
      enabledApps: decoded.enabledApps || [],
      permissions: decoded.permissions || [],
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Keep your existing permit() for Owner/Admin checks
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
