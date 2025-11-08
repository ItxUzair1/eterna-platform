const prisma = require('../config/db');

async function createNotification({ tenantId, userId, type = 'info', channel = 'app', title, message, data = {} }) {
  if (!tenantId || !userId) {
    console.warn('[notify] Missing tenantId or userId', { tenantId, userId, title });
    return null;
  }

  try {
    return await prisma.notification.create({
      data: {
        tenantId,
        userId,
        type,
        channel,
        payload: {
          title: title || 'Notification',
          message: message || '',
          ...data
        }
      }
    });
  } catch (err) {
    console.error('[notify] Failed to create notification', err.message);
    return null;
  }
}

async function markNotificationsRead({ tenantId, userId, notificationIds }) {
  if (!tenantId || !userId) return 0;
  const where = {
    tenantId,
    userId
  };
  if (Array.isArray(notificationIds) && notificationIds.length) {
    where.id = { in: notificationIds.map(Number) };
  }
  const result = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() }
  });
  return result.count;
}

async function listNotifications({ tenantId, userId, take = 20 }) {
  if (!tenantId || !userId) return [];
  return prisma.notification.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: 'desc' },
    take
  });
}

module.exports = {
  createNotification,
  markNotificationsRead,
  listNotifications
};

