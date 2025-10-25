const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, tenantId, roleId }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const permit = (...roles) => {
  return async (req, res, next) => {
    const roleId = req.user?.roleId;
    if (!roleId) return res.status(403).json({ error: 'Access denied' });
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role || !roles.includes(role.name)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = { verifyToken, permit };
