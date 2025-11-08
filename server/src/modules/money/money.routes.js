// server/src/modules/money/money.routes.js
const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { rbacGuard } = require("../../middlewares/rbacGuard");
const ctrl = require("./money.controller");
const { withSingleFile } = require("../../utils/fileHandler.js");

const r = express.Router();
r.use(verifyToken);
r.use(rbacGuard("money", "read")); // Base read access for all routes

// Transactions
r.get("/transactions", ctrl.listTransactions);
r.get("/transactions/:id", ctrl.getTransaction);
r.post("/transactions", rbacGuard("money", "write"), ctrl.createTransaction);
r.put("/transactions/:id", rbacGuard("money", "write"), ctrl.updateTransaction);
r.delete("/transactions/:id", rbacGuard("money", "write"), ctrl.deleteTransaction);

// Files
r.get("/transactions/:transactionId/files", ctrl.listTransactionFiles);
r.post("/transactions/:transactionId/files", (req, res, next) => {
  const upload = withSingleFile("file")[0];
  upload(req, res, (err) => {
    if (err) {
      console.error('[Money] Upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      if (err.code === 'SPACES_CONFIG_MISSING') {
        return res.status(500).json({ error: err.message || 'DigitalOcean Spaces is not configured.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, rbacGuard("money", "write"), ctrl.uploadTransactionFile);
r.delete("/transactions/:transactionId/files/:transactionFileId", rbacGuard("money", "write"), ctrl.deleteTransactionFile);

// Statistics
r.get("/stats", ctrl.getStats);

// Export
r.get("/export", ctrl.exportTransactions);

module.exports = r;

