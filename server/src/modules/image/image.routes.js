const router = require('express').Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const c = require('./image.controller');

// helper to accept token from query for navigation downloads
function allowQueryToken(req, _res, next) {
  if (!req.headers.authorization && req.query && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}

router.post('/jobs', verifyToken, c.createJob);
router.post('/jobs/:jobId/files', verifyToken, c.uploadFiles);
router.post('/jobs/:jobId/plan', verifyToken, c.planTargets);
router.post('/jobs/:jobId/queue', verifyToken, c.enqueueJob);
router.get('/jobs/:jobId', verifyToken, c.getJob);

// SSE already uses ?token=...
router.get('/jobs/:jobId/sse', c.sse);

// UPDATED: accept ?token for download routes opened in a new tab
router.get('/jobs/:jobId/outputs/:outputId', allowQueryToken, verifyToken, c.downloadOutput);
router.get('/jobs/:jobId/zip', allowQueryToken, verifyToken, c.downloadZip);

module.exports = router;
