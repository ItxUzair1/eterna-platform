const prisma = require("../config/db");
const { spacesUploadMiddleware } = require('./spaces');

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
  await prisma.storageUsage.upsert({
    where: { tenantId: ctx.tenantId },
    update: { usedBytes: { increment: BigInt(size) } },
    create: { tenantId: ctx.tenantId, usedBytes: BigInt(size) },
  });

  return fileRow;
}

module.exports = { withSingleFile, uploadFormFile };
