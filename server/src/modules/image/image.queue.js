// server/src/modules/image/image.queue.js
const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const { PrismaClient } = require('@prisma/client');
const { getBroker } = require('./image.ss-broker');
const { s3, uploadBufferToSpaces, uniqueKey } = require('../../utils/spaces');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const os = require('os');

const prisma = new PrismaClient();

// BullMQ requires maxRetriesPerRequest: null for persistent blocking connections (Worker/Events)
// Support VALKEY_URL or REDIS_URL
const redisUrl = process.env.VALKEY_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

const qName = 'image-convert';
const convertQueue = new Queue(qName, { connection });
const events = new QueueEvents(qName, { connection });
events.on('error', (err) => console.error('QueueEvents error:', err));

function normalizeExt(fmt) {
  return fmt === 'jpeg' ? 'jpg' : fmt;
}

// Download file from Spaces to temp location
async function downloadFromSpaces(key, tempPath) {
  const bucket = process.env.SPACES_BUCKET;
  if (!bucket) throw new Error('SPACES_BUCKET not configured');
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(cmd);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(tempPath, buffer);
  return buffer;
}

// Convert image (input and output are file paths)
async function convertOne(inputPath, outputPath, fmt) {
  const p = sharp(inputPath, { animated: true });
  switch (fmt) {
    case 'jpg':
    case 'jpeg':
      await p.jpeg({ quality: 90 }).toFile(outputPath);
      break;
    case 'png':
      await p.png({ compressionLevel: 9 }).toFile(outputPath);
      break;
    case 'bmp':
      await p.toFormat('bmp').toFile(outputPath);
      break;
    case 'gif':
      await p.gif({ reoptimise: true }).toFile(outputPath);
      break;
    case 'tiff':
      await p.tiff({ compression: 'lzw' }).toFile(outputPath);
      break;
    case 'webp':
      await p.webp({ quality: 90, effort: 4 }).toFile(outputPath);
      break;
    default:
      throw new Error(`Unsupported format: ${fmt}`);
  }
}

const worker = new Worker(
  qName,
  async (job) => {
    const { jobId } = job.data;
    const broker = getBroker(jobId);

    const jobRow = await prisma.convertJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' },
      include: { items: { include: { sourceFile: true } } }
    });

    // Use system temp directory for processing
    const tempDir = path.join(os.tmpdir(), 'image-convert', String(jobId));
    await fs.mkdir(tempDir, { recursive: true });

    let done = 0;
    for (const item of jobRow.items) {
      let tempInputPath = null;
      let tempOutputPath = null;
      try {
        await prisma.convertJobItem.update({
          where: { id: item.id },
          data: { status: 'RUNNING', error: null }
        });
        broker.emit('event', { type: 'item-start', itemId: item.id });

        const sourceKey = item.sourceFile.path; // This is now a Spaces key, not a local path
        if (!sourceKey) throw new Error('Source file key is missing');

        // Download source from Spaces to temp file
        tempInputPath = path.join(tempDir, `input-${item.id}-${Date.now()}`);
        await downloadFromSpaces(sourceKey, tempInputPath);

        // Convert to target format
        const ext = normalizeExt(item.targetFormat);
        const base = path.parse(sourceKey).name.replace(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i, '');
        tempOutputPath = path.join(tempDir, `output-${item.id}-${Date.now()}.${ext}`);
        await convertOne(tempInputPath, tempOutputPath, item.targetFormat);

        // Read converted file and upload to Spaces
        const outputBuffer = await fs.readFile(tempOutputPath);
        const outputKey = uniqueKey('image/outputs', `${base}.${ext}`);
        await uploadBufferToSpaces({
          key: outputKey,
          buffer: outputBuffer,
          contentType: `image/${ext}`,
          acl: 'private'
        });

        // Create File record with Spaces key
        const outFile = await prisma.file.create({
          data: {
            tenantId: jobRow.tenantId,
            ownerId: jobRow.userId,
            path: outputKey, // Store Spaces key, not local path
            mime: `image/${ext}`,
            size: outputBuffer.length,
            checksum: null
          }
        });

        await prisma.convertJobItem.update({
          where: { id: item.id },
          data: { status: 'DONE', outputFileId: outFile.id }
        });

        done += 1;
        broker.emit('event', {
          type: 'item-done',
          itemId: item.id,
          progress: Math.round((done / jobRow.items.length) * 100)
        });
      } catch (err) {
        await prisma.convertJobItem.update({
          where: { id: item.id },
          data: { status: 'FAILED', error: String(err.message || err) }
        });
        broker.emit('event', { type: 'item-failed', itemId: item.id, error: String(err.message || err) });
      } finally {
        // Clean up temp files
        try {
          if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
          if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
        } catch {}
      }
    }

    // Clean up temp directory
    try {
      await fs.rmdir(tempDir, { recursive: true }).catch(() => {});
    } catch {}

    const anyDone = await prisma.convertJobItem.count({ where: { jobId, status: 'DONE' } });
    await prisma.convertJob.update({
      where: { id: jobId },
      data: { status: anyDone > 0 ? 'DONE' : 'FAILED', completedAt: new Date() }
    });
    broker.emit('event', { type: 'job-done' });
  },
  { connection, concurrency: 2 }
);

worker.on('error', (err) => console.error('Worker error:', err));

async function enqueue(jobId) {
  await convertQueue.add('convert', { jobId }, { removeOnComplete: 100, removeOnFail: 100 });
}

module.exports = { enqueue };

