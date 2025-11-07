const express = require('express');
const { verifyToken } = require('../../middlewares/authMiddleware');
const controller = require('./notification.controller');

const router = express.Router();

router.use(verifyToken);

router.get('/', controller.listNotifications);
router.post('/read-all', controller.markAllRead);
router.post('/:id/read', controller.markRead);

module.exports = router;

