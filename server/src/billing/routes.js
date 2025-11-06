const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');
const { startCheckout, startPortal, confirmCheckoutSession } = require('./service');

// All routes expect an authenticated context with tenantId
router.post('/checkout/start', verifyToken, async (req, res) => {
  try {
    console.log('[billing] checkout/start - req.user:', req.user);
    const tenantId = Number(req.user?.tenantId || req.body?.tenantId || req.query?.tenantId);
    console.log('[billing] checkout/start - tenantId:', tenantId);
    if (!tenantId || isNaN(tenantId)) {
      console.error('[billing] checkout/start - Missing tenantId, req.user:', req.user);
      return res.status(400).json({ error: 'Missing tenantId', debug: { user: req.user } });
    }
    const { plan, seats, addons } = req.body;
    console.log('[billing] checkout/start - plan, seats, addons:', plan, seats, addons);
    const result = await startCheckout({ tenantId, plan, seats, addons });
    res.json(result);
  } catch (e) {
    console.error('[billing] checkout/start error:', e);
    res.status(400).json({ error: e.message, stack: process.env.NODE_ENV === 'development' ? e.stack : undefined });
  }
});

router.post('/portal', verifyToken, async (req, res) => {
  try {
    console.log('[billing] portal - req.user:', req.user);
    const tenantId = Number(req.user?.tenantId || req.body?.tenantId || req.query?.tenantId);
    console.log('[billing] portal - tenantId:', tenantId);
    if (!tenantId || isNaN(tenantId)) {
      console.error('[billing] portal - Missing tenantId, req.user:', req.user);
      return res.status(400).json({ error: 'Missing tenantId', debug: { user: req.user } });
    }
    const result = await startPortal({ tenantId });
    res.json(result);
  } catch (e) {
    console.error('[billing] portal error:', e);
    res.status(400).json({ error: e.message, stack: process.env.NODE_ENV === 'development' ? e.stack : undefined });
  }
});

module.exports = router;

// Optional: confirm session without webhooks
router.post('/checkout/confirm', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    const result = await confirmCheckoutSession({ sessionId });
    res.json(result);
  } catch (e) {
    console.error('[billing] confirm error:', e);
    res.status(400).json({ error: e.message });
  }
});


