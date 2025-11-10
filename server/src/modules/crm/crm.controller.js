// server/src/controllers/crmController.js
const svc = require("./crm.Service");
const { createNotification } = require('../../utils/notify');

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
    await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'success',
      title: 'Lead created',
      message: `Lead "${lead.name}" has been added to the pipeline.`,
      data: { leadId: lead.id }
    });
    res.status(201).json(lead);
  } catch (e) { next(e); }
}

async function updateLead(req, res, next) {
  try {
    const ctx = req.context;
    const lead = await svc.updateLead(ctx, +req.params.id, req.body);
    await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'info',
      title: 'Lead updated',
      message: `Lead "${lead.name}" has been updated.`,
      data: { leadId: lead.id }
    });
    res.json(lead);
  } catch (e) { next(e); }
}

async function bulkDeleteLeads(req, res, next) {
  try {
    const ctx = req.context;
    const { ids } = req.body;
    await svc.bulkDeleteLeads(ctx, ids);
     await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'warning',
      title: 'Leads deleted',
      message: `${ids.length} lead(s) were removed from the CRM.`,
      data: { leadIds: ids }
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function assignLeads(req, res, next) {
  try {
    const ctx = req.context;
    const { ids, ownerId } = req.body;
    await svc.assignLeads(ctx, ids, ownerId);
    await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'info',
      title: 'Leads reassigned',
      message: `${ids.length} lead(s) assigned to user ${ownerId}.`,
      data: { leadIds: ids }
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// Statuses
const listStatuses = async (req, res, n) => { try { res.json({ items: await svc.listStatuses(req.context) }); } catch (e) { n(e); } };
const upsertStatus = async (req, res, n) => { try { res.json(await svc.upsertStatus(req.context, req.body)); } catch (e) { n(e); } };
const deleteStatus = async (req, res, n) => { try { await svc.deleteStatus(req.context, +req.params.id); res.json({ ok: true }); } catch (e) { n(e); } };

// Appointments
const listAppointments = async (req, res, n) => { try { res.json({ items: await svc.listAppointments(req.context, +req.params.leadId) }); } catch (e) { n(e); } };
const createAppointment = async (req, res, n) => {
  try {
    const appointment = await svc.createAppointment(req.context, +req.params.leadId, req.body);
    await createNotification({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      type: 'success',
      title: 'Appointment scheduled',
      message: `New appointment scheduled for lead ${req.params.leadId}.`,
      data: { appointmentId: appointment.id }
    });
    res.status(201).json(appointment);
  } catch (e) { n(e); }
};
const updateAppointment = async (req, res, n) => {
  try {
    const appointment = await svc.updateAppointment(req.context, +req.params.leadId, +req.params.id, req.body);
    await createNotification({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      type: 'info',
      title: 'Appointment updated',
      message: 'An appointment has been updated.',
      data: { appointmentId: appointment.id }
    });
    res.json(appointment);
  } catch (e) { n(e); }
};
const deleteAppointment = async (req, res, n) => {
  try {
    await svc.deleteAppointment(req.context, +req.params.leadId, +req.params.id);
    await createNotification({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      type: 'warning',
      title: 'Appointment cancelled',
      message: 'An appointment was removed.',
      data: { appointmentId: Number(req.params.id) }
    });
    res.json({ ok: true });
  } catch (e) { n(e); }
};

// Files
const listLeadFiles = async (req, res, n) => { try { res.json({ items: await svc.listLeadFiles(req.context, +req.params.leadId) }); } catch (e) { n(e); } };
const uploadLeadFile = async (req, res, n) => { try { res.status(201).json(await svc.uploadLeadFile(req.context, +req.params.leadId, req)); } catch (e) { n(e); } };
const deleteLeadFile = async (req, res, n) => { try { await svc.deleteLeadFile(req.context, +req.params.leadId, +req.params.leadFileId); res.json({ ok: true }); } catch (e) { n(e); } };

// Import
const importCsv = async (req, res, n) => { try { const result = await svc.importCsv(req.context, req); res.json(result); } catch (e) { n(e); } };

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
