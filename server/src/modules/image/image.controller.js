// server/src/modules/image/image.controller.js
const path = require('path');
const fs = require('fs');
const fsAsync = require('fs/promises');
const archiver = require('archiver');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const { enqueue } = require('./image.queue');
const { getBroker } = require('./image.ss-broker');

const prisma = new PrismaClient();
const upload = multer({ dest: path.join(process.cwd(), 'tmp', 'uploads') });

const OK_FORMATS = new Set(['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'webp']);
const MAX_FILES = 100;
const MAX_TOTAL = 200 * 1024 * 1024;

function val(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// Create a job with targets csv; items are created later in planTargets
exports.createJob = [
  body('targets').isString().withMessage('targets is required, e.g. "jpg,png"'),
  async (req, res) => {
    if (!val(req, res)) return;
    const list = String(req.body.targets || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!list.length) return res.status(400).json({ error: 'Select at least one target format' });
    for (const f of list) if (!OK_FORMATS.has(f)) return res.status(400).json({ error: `Unsupported format: ${f}` });
    const job = await prisma.convertJob.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        status: 'PENDING'
      }
    });
    res.json(job);
  }
];

// Upload originals and persist in File
exports.uploadFiles = [
  param('jobId').isInt(),
  upload.array('files', MAX_FILES),
  async (req, res) => {
    if (!val(req, res)) return;
    const files = req.files || [];
    const total = files.reduce((s, f) => s + f.size, 0);
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });
    if (files.length > MAX_FILES) return res.status(400).json({ error: `Max ${MAX_FILES} files` });
    if (total > MAX_TOTAL) return res.status(400).json({ error: 'Total size exceeds 200MB' });

    const saved = [];
    for (const f of files) {
      const row = await prisma.file.create({
        data: {
          tenantId: req.user.tenantId,
          ownerId: req.user.id,
          path: f.path,
          mime: f.mimetype,
          size: Number(f.size),
          checksum: null
        }
      });
      saved.push({ id: row.id, originalName: f.originalname });
    }
    res.json({ jobId: Number(req.params.jobId), files: saved });
  }
];

// Plan items for this job from fileIds x targets
exports.planTargets = [
  param('jobId').isInt(),
  body('targets').isArray().withMessage('targets array required'),
  body('fileIds').isArray().optional(),
  async (req, res) => {
    if (!val(req, res)) return;
    const jobId = Number(req.params.jobId);
    const targets = (req.body.targets || []).map(s => String(s).toLowerCase());
    if (!targets.length) return res.status(400).json({ error: 'No targets' });
    for (const t of targets) if (!OK_FORMATS.has(t)) return res.status(400).json({ error: `Unsupported: ${t}` });

    let originals = [];
    if (Array.isArray(req.body.fileIds) && req.body.fileIds.length) {
      originals = await prisma.file.findMany({
        where: {
          tenantId: req.user.tenantId,
          ownerId: req.user.id,
          id: { in: req.body.fileIds }
        }
      });
    } else {
      // Fallback: pick latest tmp uploads for this user (dev convenience)
      originals = await prisma.file.findMany({
        where: {
          tenantId: req.user.tenantId,
          ownerId: req.user.id,
          path: { startsWith: path.join(process.cwd(), 'tmp', 'uploads') }
        },
        orderBy: { id: 'desc' },
        take: 100
      });
    }

    if (!originals.length) return res.status(400).json({ error: 'No uploaded files found for this job/user' });

    const items = [];
    for (const f of originals) for (const t of targets) {
      items.push({ jobId, sourceFileId: f.id, targetFormat: t, status: 'PENDING' });
    }
    if (items.length) await prisma.convertJobItem.createMany({ data: items });

    await prisma.convertJob.update({ where: { id: jobId }, data: { status: 'QUEUED' } });
    res.json({ jobId, items: items.length });
  }
];

// Enqueue background processing
exports.enqueueJob = [
  param('jobId').isInt(),
  async (req, res) => {
    if (!val(req, res)) return;
    await enqueue(Number(req.params.jobId));
    res.json({ queued: true });
  }
];

// Get job
exports.getJob = [
  param('jobId').isInt(),
  async (req, res) => {
    if (!val(req, res)) return;
    const jobId = Number(req.params.jobId);
    const data = await prisma.convertJob.findUnique({
      where: { id: jobId },
      include: { items: { include: { sourceFile: true, outputFile: true } } }
    });
    res.json(data);
  }
];

// SSE stream for live progress
exports.sse = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).end();
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  const jobId = Number(req.params.jobId);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const broker = getBroker(jobId);
  const send = (evt) => res.write(`data: ${JSON.stringify(evt)}\n\n`);
  const listener = (evt) => send(evt);

  broker.on('event', listener);
  send({ type: 'connected' });

  req.on('close', () => broker.off('event', listener));
};

// Download a single output
exports.downloadOutput = [
  param('jobId').isInt(),
  param('outputId').isInt(),
  async (req, res) => {
    if (!val(req, res)) return;
    const jobId = Number(req.params.jobId);
    const outId = Number(req.params.outputId);
    const item = await prisma.convertJobItem.findFirst({
      where: { jobId, outputFileId: outId },
      include: { outputFile: true }
    });
    if (!item?.outputFile) return res.status(404).end();
    const outPath = item.outputFile.path;
    const filename = path.basename(outPath);
    res.download(outPath, filename);
  }
];

// Download a ZIP of all successful outputs
exports.downloadZip = [
  param('jobId').isInt(),
  async (req, res) => {
    if (!val(req, res)) return;
    const jobId = Number(req.params.jobId);
    const items = await prisma.convertJobItem.findMany({
      where: { jobId, status: 'DONE' },
      include: { outputFile: true }
    });
    if (!items.length) return res.status(404).json({ error: 'No outputs to zip' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="job-${jobId}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => res.status(500).end(String(err)));
    archive.pipe(res);

    for (const it of items) {
      const outPath = it.outputFile.path;
      archive.file(outPath, { name: path.basename(outPath) });
    }
    archive.finalize();
  }
];
