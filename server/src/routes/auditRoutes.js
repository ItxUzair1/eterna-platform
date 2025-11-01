const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { rbacGuard } = require('../middlewares/rbacGuard');
const prisma = require('../config/db');

router.use(verifyToken);

router.get('/', rbacGuard('admin','read'), async (req, res) => {
  const limit = Math.min(200, +(req.query.limit||100));
  const rows = await prisma.auditLog.findMany({
    where: { tenantId: req.context.tenantId },
    orderBy: { id: 'desc' },
    take: limit,
    include: { actor: { select: { email: true, id: true } } }
  });
  res.json({ rows });
});

module.exports = router;
