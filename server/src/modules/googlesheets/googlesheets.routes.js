// server/src/modules/googlesheets/googlesheets.routes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middlewares/authMiddleware");
const { rbacGuard } = require("../../middlewares/rbacGuard");
const ctrl = require("./googlesheets.controller.js");

router.use(verifyToken);
router.use(rbacGuard("crm", "read")); // Base permission check

// List all connections
router.get("/connections", ctrl.listConnections);

// Get connection details
router.get("/connections/:id", ctrl.getConnection);

// Create/Update connection
router.post("/connections", rbacGuard("crm", "write"), ctrl.upsertConnection);
router.put("/connections/:id", rbacGuard("crm", "write"), ctrl.upsertConnection);

// Delete connection
router.delete("/connections/:id", rbacGuard("crm", "write"), ctrl.deleteConnection);

// Get spreadsheet info
router.post("/spreadsheet-info", ctrl.getSpreadsheetInfo);

// Get sheet headers
router.post("/sheet-headers", ctrl.getSheetHeaders);

// Sync operations
router.post("/connections/:id/sync/import", rbacGuard("crm", "write"), ctrl.syncImport);
router.post("/connections/:id/sync/export", rbacGuard("crm", "write"), ctrl.syncExport);
router.post("/connections/:id/sync/bidirectional", rbacGuard("crm", "write"), ctrl.syncBidirectional);

module.exports = router;

