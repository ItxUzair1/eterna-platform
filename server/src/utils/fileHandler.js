const prisma = require("../config/db");
const { spacesUploadMiddleware } = require('./spaces');
const { getEntitlements } = require('../entitlements/middleware');

/**
 * Check if tenant has enough storage space for the requested file size
 * @param {number} tenantId - Tenant ID
 * @param {number} fileSizeBytes - Size of file to upload in bytes
 * @throws {Error} If storage limit would be exceeded
 */
async function checkStorageLimit(tenantId, fileSizeBytes) {
  const ent = await getEntitlements(tenantId);
  const storage = await prisma.storageUsage.findUnique({ where: { tenantId } });
  const usedBytes = storage ? Number(storage.usedBytes) : 0;
  const entitledBytes = ent.storageEntitledGB * (1024 ** 3);
  const newTotal = usedBytes + fileSizeBytes;

  if (newTotal > entitledBytes) {
    const usedGB = usedBytes / (1024 ** 3);
    const entitledGB = ent.storageEntitledGB;
    const error = new Error(`Storage limit exceeded. You have used ${usedGB.toFixed(2)} GB of ${entitledGB} GB. Please upgrade your storage.`);
    error.code = 'OVER_QUOTA';
    error.status = 403;
    throw error;
  }
}

/**
 * Increment storage usage after successful file upload
 * @param {number} tenantId - Tenant ID
 * @param {number} fileSizeBytes - Size of uploaded file in bytes
 */
async function incrementStorageUsage(tenantId, fileSizeBytes) {
  await prisma.storageUsage.upsert({
    where: { tenantId },
    update: { usedBytes: { increment: BigInt(fileSizeBytes) } },
    create: { tenantId, usedBytes: BigInt(fileSizeBytes) },
  });
}

/**
 * Decrement storage usage when file is deleted
 * @param {number} tenantId - Tenant ID
 * @param {number} fileSizeBytes - Size of deleted file in bytes
 */
async function decrementStorageUsage(tenantId, fileSizeBytes) {
  const storage = await prisma.storageUsage.findUnique({ where: { tenantId } });
  if (storage) {
    const newUsedBytes = BigInt(storage.usedBytes) - BigInt(fileSizeBytes);
    // Ensure we don't go below 0
    const finalBytes = newUsedBytes < 0n ? 0n : newUsedBytes;
    await prisma.storageUsage.update({
      where: { tenantId },
      data: { usedBytes: finalBytes },
    });
  }
}

function withSingleFile(field = "file") {
  return [spacesUploadMiddleware(field, { maxCount: 1, prefix: 'uploads' })];
}

async function uploadFormFile(ctx, reqOrFile) {
  const file = reqOrFile?.file ? reqOrFile.file : reqOrFile; // support (ctx, req) and (ctx, file)
  if (!file) {
    const e = new Error("No file uploaded");
    e.status = 400;
    throw e;
  }
  const filePath = file.key; // store object key in path field
  const size = file.size;
  const mime = file.mimetype;

  // Check storage limit before creating file record
  await checkStorageLimit(ctx.tenantId, size);

  const fileRow = await prisma.file.create({
    data: {
      tenantId: ctx.tenantId,
      ownerId: ctx.userId,
      path: filePath,
      mime,
      size: Number(size),
      checksum: null,
    },
  });

  // increment storage usage
  await incrementStorageUsage(ctx.tenantId, size);

  return fileRow;
}

module.exports = { withSingleFile, uploadFormFile, checkStorageLimit, incrementStorageUsage, decrementStorageUsage };
