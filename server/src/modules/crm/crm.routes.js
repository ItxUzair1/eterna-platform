// server/src/routes/crmRoutes.js
const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const ctrl = require("../crm/crm.controller.js");
const { withSingleFile } = require("../../utils/fileHandler.js");

const r = express.Router();
r.use(verifyToken);

// Leads
r.get("/leads", ctrl.listLeads);
r.get("/leads/:id", ctrl.getLead);
r.post("/leads", ctrl.createLead);
r.put("/leads/:id", ctrl.updateLead);
r.post("/leads/bulk-delete", ctrl.bulkDeleteLeads);
r.post("/leads/assign", ctrl.assignLeads);

// Files
r.get("/leads/:leadId/files", ctrl.listLeadFiles);
r.post("/leads/:leadId/files", (req, res, next) => {
  const upload = withSingleFile("file")[0];
  upload(req, res, (err) => {
    if (err) {
      console.error('[CRM] Upload error:', err);
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
}, ctrl.uploadLeadFile);
r.delete("/leads/:leadId/files/:leadFileId", ctrl.deleteLeadFile);

// Statuses
r.get("/statuses", ctrl.listStatuses);
r.post("/statuses", ctrl.upsertStatus);
r.delete("/statuses/:id", ctrl.deleteStatus);

// Appointments
r.get("/leads/:leadId/appointments", ctrl.listAppointments);
r.post("/leads/:leadId/appointments", ctrl.createAppointment);
r.put("/leads/:leadId/appointments/:id", ctrl.updateAppointment);
r.delete("/leads/:leadId/appointments/:id", ctrl.deleteAppointment);

r.post("/import/csv", withSingleFile("file"), ctrl.importCsv);


module.exports = r;
