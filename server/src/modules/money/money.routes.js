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
r.post("/transactions/:transactionId/files", withSingleFile("file"), rbacGuard("money", "write"), ctrl.uploadTransactionFile);
r.delete("/transactions/:transactionId/files/:transactionFileId", rbacGuard("money", "write"), ctrl.deleteTransactionFile);

// Statistics
r.get("/stats", ctrl.getStats);

// Export
r.get("/export", ctrl.exportTransactions);

module.exports = r;

