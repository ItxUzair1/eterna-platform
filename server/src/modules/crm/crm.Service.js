// server/src/modules/crm/crm.service.js
const { ensureScope } = require("../../utils/authorize.js");
const { audit } = require("../../utils/audit.js");
const { uploadFormFile } = require("../../utils/fileHandler.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const csv = require("csv-parser");
const fs = require("fs");

const DEFAULT_STATUSES = [
  { value: "New",         color: "#64748b", sortOrder: 10 },
  { value: "In Progress", color: "#3b82f6", sortOrder: 20 },
  { value: "Pending",     color: "#f59e0b", sortOrder: 30 },
  { value: "Won",         color: "#10b981", sortOrder: 40 },
  { value: "Lost",        color: "#ef4444", sortOrder: 50 },
];

// ---- Statuses (single definition with bootstrap) ----
async function listStatuses(ctx) {
  const existing = await prisma.leadStatus.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
  });
  if (existing.length) return existing;

  await prisma.leadStatus.createMany({
    data: DEFAULT_STATUSES.map((s) => ({ ...s, tenantId: ctx.tenantId })),
    skipDuplicates: true,
  });
  return prisma.leadStatus.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
  });
}

async function upsertStatus(ctx, { id, value, color, sortOrder }) {
  ensureScope(ctx, "crm", "admin");
  if (id) {
    return prisma.leadStatus.update({ where: { id }, data: { value, color, sortOrder } });
  }
  return prisma.leadStatus.create({ data: { tenantId: ctx.tenantId, value, color, sortOrder } });
}

async function deleteStatus(ctx, id) {
  ensureScope(ctx, "crm", "admin");
  return prisma.leadStatus.delete({ where: { id } });
}

// ---- Leads ----
async function listLeads(ctx, { q, statusId, ownerId, page, pageSize, sort }) {
  ensureScope(ctx, "crm", "read");
  const where = { tenantId: ctx.tenantId };
  if (q)
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
    ];
  if (statusId) where.statusId = +statusId;
  if (ownerId) where.ownerId = +ownerId;

  const [total, items] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: { status: true, owner: { select: { id: true, email: true, username: true } } },
      orderBy: toOrder(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize };
}

async function getLead(ctx, id) {
  ensureScope(ctx, "crm", "read");
  return prisma.lead.findFirstOrThrow({
    where: { id, tenantId: ctx.tenantId },
    include: { status: true, owner: { select: { id: true, email: true, username: true } } },
  });
}

async function createLead(ctx, payload) {
  ensureScope(ctx, "crm", "write");
  const data = sanitizeLead(ctx, payload);
  const lead = await prisma.lead.create({ data });
  await audit(ctx, "lead.create", "Lead", lead.id, { new: lead });
  return lead;
}

async function updateLead(ctx, id, payload) {
  ensureScope(ctx, "crm", "write");
  const existing = await prisma.lead.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId } });
  const lead = await prisma.lead.update({ where: { id }, data: sanitizeLead(ctx, payload, false) });
  await audit(ctx, "lead.update", "Lead", id, { old: existing, new: lead });
  return lead;
}

async function bulkDeleteLeads(ctx, ids) {
  ensureScope(ctx, "crm", "write");
  await prisma.lead.deleteMany({ where: { id: { in: ids }, tenantId: ctx.enantId } }); // ensure tenant filter
  await audit(ctx, "lead.bulkDelete", "Lead", null, { ids });
}

async function assignLeads(ctx, ids, ownerId) {
  ensureScope(ctx, "crm", "write");
  await prisma.lead.updateMany({
    where: { id: { in: ids }, tenantId: ctx.tenantId },
    data: { ownerId: ownerId ? +ownerId : null },
  });
  await audit(ctx, "lead.assign", "Lead", null, { ids, ownerId });
}

// ---- Appointments ----
const listAppointments = (ctx, leadId) =>
  prisma.leadAppointment.findMany({
    where: { leadId, lead: { tenantId: ctx.tenantId } },
    orderBy: { startsAt: "desc" },
  });

const createAppointment = (ctx, leadId, payload) =>
  prisma.leadAppointment.create({
    data: {
      leadId,
      startsAt: new Date(payload.startsAt),
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      location: payload.location || null,
      notes: payload.notes || null,
    },
  });

const updateAppointment = (ctx, leadId, id, payload) =>
  prisma.leadAppointment.update({
    where: { id },
    data: {
      startsAt: new Date(payload.startsAt),
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      location: payload.location || null,
      notes: payload.notes || null,
    },
  });

const deleteAppointment = (ctx, leadId, id) => prisma.leadAppointment.delete({ where: { id } });

// ---- Files ----
async function listLeadFiles(ctx, leadId) {
  return prisma.leadFile.findMany({
    where: { leadId, tenantId: ctx.tenantId },
    include: { file: true },
    orderBy: { id: "desc" },
  });
}

async function uploadLeadFile(ctx, leadId, req) {
  ensureScope(ctx, "crm", "write");
  const upload = await uploadFormFile(ctx, req);
  const link = await prisma.leadFile.create({ data: { tenantId: ctx.tenantId, leadId, fileId: upload.id } });
  await audit(ctx, "lead.file.upload", "Lead", leadId, { fileId: upload.id });
  return link;
}

async function deleteLeadFile(ctx, leadId, leadFileId) {
  ensureScope(ctx, "crm", "write");
  await prisma.leadFile.delete({ where: { id: leadFileId } });
  await audit(ctx, "lead.file.delete", "Lead", leadId, { leadFileId });
}

async function importCsv(ctx, req) {
  return new Promise((resolve, reject) => {
    const results = [];
    const mapping = JSON.parse(req.body.mapping || "{}");

    if (!req.file?.path) {
      return reject(new Error("No CSV file uploaded"));
    }

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        const lead = {
          tenantId: ctx.tenantId, // assuming tenant info from auth middleware
          name: data[mapping.name],
          email: data[mapping.email],
          phone: data[mapping.phone],
          company: data[mapping.company],
          tags: data[mapping.tags],
        };
        results.push(lead);
      })
      .on("end", async () => {
        try {
          await prisma.lead.createMany({ data: results });
          console.log(`Imported ${results.length} leads`);
          resolve(results);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}

// ---- utils ----
function sanitizeLead(ctx, payload, creating = true) {
  const base = {
    tenantId: ctx.tenantId,
    name: payload.name?.trim(),
    company: payload.company || null,
    email: payload.email || null,
    phone: payload.phone || null,
    statusId: payload.statusId ? +payload.statusId : null,
    tags: payload.tags || null,
  };
  if (!base.name) throw new Error("Name is required");
  if (payload.ownerId !== undefined) base.ownerId = payload.ownerId ? +payload.ownerId : null;
  return base;
}

function toOrder(sort) {
  const [field, dir] = (sort || "updatedAt:desc").split(":");
  return { [field]: dir?.toLowerCase() === "asc" ? "asc" : "desc" };
}

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
