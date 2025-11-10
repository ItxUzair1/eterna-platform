// server/src/modules/crm/crm.service.js
const { ensureScope } = require("../../utils/authorize.js");
const { audit } = require("../../utils/audit.js");
const { uploadFormFile } = require("../../utils/fileHandler.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { s3 } = require("../../utils/spaces.js");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

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
  await prisma.lead.deleteMany({ where: { id: { in: ids }, tenantId: ctx.tenantId } }); // ensure tenant filter
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
  const leadFile = await prisma.leadFile.findFirstOrThrow({
    where: { id: leadFileId },
    include: { file: true },
  });
  const fileSize = leadFile.file.size;
  await prisma.leadFile.delete({ where: { id: leadFileId } });
  await prisma.file.delete({ where: { id: leadFile.file.id } });
  
  // Decrement storage usage
  const { decrementStorageUsage } = require("../../utils/fileHandler.js");
  await decrementStorageUsage(ctx.tenantId, fileSize);
  
  await audit(ctx, "lead.file.delete", "Lead", leadId, { leadFileId });
}

async function importCsv(ctx, req) {
  ensureScope(ctx, "crm", "write");
  
  const mapping = JSON.parse(req.body.mapping || "{}");

  // Check if file exists (either disk storage with path or S3 storage with key)
  if (!req.file) {
    throw new Error("No CSV file uploaded");
  }

  // Determine file path: disk storage uses path, S3 storage uses key
  let filePath = req.file.path;
  let tempFilePath = null;

  // If no path, check for S3 key
  if (!filePath && req.file.key) {
    // Download from S3 to temporary file
    if (!s3) {
      throw new Error("S3 client not initialized. Cannot process CSV from S3 storage.");
    }
    const SPACES_BUCKET = process.env.SPACES_BUCKET?.trim().replace(/^["']|["']$/g, '');
    if (!SPACES_BUCKET) {
      throw new Error("SPACES_BUCKET not configured");
    }
    
    tempFilePath = path.join(os.tmpdir(), `csv-import-${Date.now()}-${Math.random().toString(36).substring(7)}.csv`);
    const getObjectCmd = new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: req.file.key,
    });
    
    const response = await s3.send(getObjectCmd);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(tempFilePath, buffer);
    filePath = tempFilePath;
  }

  if (!filePath) {
    throw new Error("No CSV file uploaded or file path not available");
  }

  if (!mapping.name) {
    throw new Error("Name column mapping is required");
  }

  // Get all statuses for lookup (once, before processing)
  const statuses = await prisma.leadStatus.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, value: true },
  });
  const statusMap = new Map(statuses.map((s) => [s.value.toLowerCase(), s.id]));

  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let rowIndex = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        rowIndex++;
        const name = (data[mapping.name] || "").trim();
        
        // Validate required field
        if (!name) {
          errors.push({ row: rowIndex + 1, field: "name", message: "Name is required" });
          return;
        }

        // Validate email if provided
        if (mapping.email && data[mapping.email]) {
          const email = data[mapping.email].trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (email && !emailRegex.test(email)) {
            errors.push({ row: rowIndex + 1, field: "email", message: "Invalid email format" });
          }
        }

        // Lookup status if provided
        let statusId = null;
        if (mapping.status && data[mapping.status]) {
          const statusValue = data[mapping.status].trim().toLowerCase();
          statusId = statusMap.get(statusValue) || null;
        }

        const lead = {
          tenantId: ctx.tenantId,
          name,
          email: (data[mapping.email] || "").trim() || null,
          phone: (data[mapping.phone] || "").trim() || null,
          company: (data[mapping.company] || "").trim() || null,
          tags: (data[mapping.tags] || "").trim() || null,
          statusId,
        };
        results.push(lead);
      })
      .on("end", async () => {
        try {
          // Clean up temporary file if it was downloaded from S3
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }

          // Only create valid leads
          const validLeads = results.filter((lead) => lead.name);
          if (validLeads.length > 0) {
            await prisma.lead.createMany({ 
              data: validLeads,
              skipDuplicates: true // Skip duplicates based on unique constraints
            });
            await audit(ctx, "lead.import", "Lead", null, { count: validLeads.length });
          }
          resolve({
            imported: validLeads.length,
            total: rowIndex,
            errors,
          });
        } catch (err) {
          // Clean up temporary file on error
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          reject(err);
        }
      })
      .on("error", (err) => {
        // Clean up temporary file on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        reject(err);
      });
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
  const direction = dir?.toLowerCase() === "asc" ? "asc" : "desc";
  
  // Handle nested sorting for status and owner
  if (field === "statusId") {
    return { status: { value: direction } };
  }
  if (field === "ownerId") {
    return { owner: { username: direction } };
  }
  
  return { [field]: direction };
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
