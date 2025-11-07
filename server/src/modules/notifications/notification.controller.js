const prisma = require('../../config/db');
const { markNotificationsRead } = require('../../utils/notify');

const listNotifications = async (req, res) => {
  const { tenantId, userId } = req.context || {};
  const take = Math.max(1, Math.min(Number(req.query.take) || 50, 200));

  const notifications = await prisma.notification.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: 'desc' },
    take
  });

  res.json({ notifications });
};

const markRead = async (req, res) => {
  const { tenantId, userId } = req.context || {};
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [req.params.id].filter(Boolean);
  const count = await markNotificationsRead({ tenantId, userId, notificationIds: ids });
  res.json({ ok: true, count });
};

const markAllRead = async (req, res) => {
  const { tenantId, userId } = req.context || {};
  const count = await markNotificationsRead({ tenantId, userId });
  res.json({ ok: true, count });
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead
};

