const path = require("path");
const fs = require("fs");
const multer = require("multer");
const prisma = require("../config/db");

const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

function withSingleFile(field = "file") {
  return [upload.single(field)];
}

async function uploadFormFile(ctx, req) {
  if (!req.file) {
    const e = new Error("No file uploaded");
    e.status = 400;
    throw e;
  }
  const filePath = req.file.path;
  const size = req.file.size;
  const mime = req.file.mimetype;

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
