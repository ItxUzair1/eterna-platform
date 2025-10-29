// server/src/modules/image/image.queue.js
const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const { PrismaClient } = require('@prisma/client');
const { getBroker } = require('./image.ss-broker');

const prisma = new PrismaClient();

// BullMQ requires maxRetriesPerRequest: null for persistent blocking connections (Worker/Events)
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
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

    const outDir = path.join(process.cwd(), 'uploads', 'convert', String(jobId));
    await fs.mkdir(outDir, { recursive: true });

    let done = 0;
    for (const item of jobRow.items) {
      try {
        await prisma.convertJobItem.update({
          where: { id: item.id },
          data: { status: 'RUNNING', error: null }
        });
        broker.emit('event', { type: 'item-start', itemId: item.id });

        const ext = normalizeExt(item.targetFormat);
        const base = path.parse(item.sourceFile.path).name; // File.path is in your schema
        const outName = `${base}.${ext}`;
        const outPath = path.join(outDir, `${item.id}-${outName}`);

        await convertOne(item.sourceFile.path, outPath, item.targetFormat);

        const st = await fs.stat(outPath);
        const outFile = await prisma.file.create({
          data: {
            tenantId: jobRow.tenantId,
            ownerId: jobRow.userId,     // matches File.ownerId
            path: outPath,              // matches File.path
            mime: `image/${ext}`,
            size: Number(st.size),      // File.size is Int
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
      }
    }

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
