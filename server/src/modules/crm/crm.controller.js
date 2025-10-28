// server/src/controllers/crmController.js
const svc = require("./crm.Service");

async function listLeads(req, res, next) {
  try {
    const ctx = req.context; // tenantId, userId
    const { q, statusId, ownerId, page = 1, pageSize = 20, sort = "updatedAt:desc" } = req.query;
    const result = await svc.listLeads(ctx, { q, statusId, ownerId, page: +page, pageSize: +pageSize, sort });
    res.json(result);
  } catch (e) { next(e); }
}

async function getLead(req, res, next) {
  try {
    const ctx = req.context;
    const lead = await svc.getLead(ctx, +req.params.id);
    res.json(lead);
  } catch (e) { next(e); }
}

async function createLead(req, res, next) {
  try {
    const ctx = req.context;
    const lead = await svc.createLead(ctx, req.body);
    res.status(201).json(lead);
  } catch (e) { next(e); }
}

async function updateLead(req, res, next) {
  try {
    const ctx = req.context;
    const lead = await svc.updateLead(ctx, +req.params.id, req.body);
    res.json(lead);
  } catch (e) { next(e); }
}

async function bulkDeleteLeads(req, res, next) {
  try {
    const ctx = req.context;
    const { ids } = req.body;
    await svc.bulkDeleteLeads(ctx, ids);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function assignLeads(req, res, next) {
  try {
    const ctx = req.context;
    const { ids, ownerId } = req.body;
    await svc.assignLeads(ctx, ids, ownerId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// Statuses
const listStatuses = async (req, res, n) => { try { res.json({ items: await svc.listStatuses(req.context) }); } catch (e) { n(e); } };
const upsertStatus = async (req, res, n) => { try { res.json(await svc.upsertStatus(req.context, req.body)); } catch (e) { n(e); } };
const deleteStatus = async (req, res, n) => { try { await svc.deleteStatus(req.context, +req.params.id); res.json({ ok: true }); } catch (e) { n(e); } };

// Appointments
const listAppointments = async (req, res, n) => { try { res.json({ items: await svc.listAppointments(req.context, +req.params.leadId) }); } catch (e) { n(e); } };
const createAppointment = async (req, res, n) => { try { res.status(201).json(await svc.createAppointment(req.context, +req.params.leadId, req.body)); } catch (e) { n(e); } };
const updateAppointment = async (req, res, n) => { try { res.json(await svc.updateAppointment(req.context, +req.params.leadId, +req.params.id, req.body)); } catch (e) { n(e); } };
const deleteAppointment = async (req, res, n) => { try { await svc.deleteAppointment(req.context, +req.params.leadId, +req.params.id); res.json({ ok: true }); } catch (e) { n(e); } };

// Files
const listLeadFiles = async (req, res, n) => { try { res.json({ items: await svc.listLeadFiles(req.context, +req.params.leadId) }); } catch (e) { n(e); } };
const uploadLeadFile = async (req, res, n) => { try { res.status(201).json(await svc.uploadLeadFile(req.context, +req.params.leadId, req)); } catch (e) { n(e); } };
const deleteLeadFile = async (req, res, n) => { try { await svc.deleteLeadFile(req.context, +req.params.leadId, +req.params.leadFileId); res.json({ ok: true }); } catch (e) { n(e); } };

// Import
const importCsv = async (req, res, n) => { try { await svc.importCsv(req.context, req); res.json({ ok: true }); } catch (e) { n(e); } };

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  bulkDeleteLeads,
  assignLeads,
  listStatuses,
  upsertStatus,
  deleteStatus,
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listLeadFiles,
  uploadLeadFile,
  deleteLeadFile,
  importCsv,
};
