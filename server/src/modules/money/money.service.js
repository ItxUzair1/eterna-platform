// server/src/modules/money/money.service.js
const { ensureScope } = require("../../utils/authorize.js");
const { audit } = require("../../utils/audit.js");
const { uploadFormFile } = require("../../utils/fileHandler.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Generate auto invoice number: INV-YYYY-NNNN
async function generateInvoiceNo(tenantId) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Find the last invoice for this tenant in the current year
  const lastTransaction = await prisma.transaction.findFirst({
    where: {
      tenantId,
      invoiceNo: { startsWith: prefix }
    },
    orderBy: { invoiceNo: "desc" },
  });

  let nextNum = 1;
  if (lastTransaction) {
    const lastNum = parseInt(lastTransaction.invoiceNo.replace(prefix, ""));
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

async function listTransactions(ctx, { q, type, category, paymentMethod, startDate, endDate, page = 1, pageSize = 20, sort = "date:desc" }) {
  ensureScope(ctx, "money", "read");
  
  const where = { tenantId: ctx.tenantId };
  
  if (q) {
    where.OR = [
      { invoiceNo: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { comment: { contains: q, mode: "insensitive" } },
    ];
  }
  
  if (type) where.type = type;
  if (category) where.category = category;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        creator: { select: { id: true, username: true, email: true } },
        files: {
          include: { file: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: toOrder(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, items, page, pageSize };
}

async function getTransaction(ctx, id) {
  ensureScope(ctx, "money", "read");
  return prisma.transaction.findFirstOrThrow({
    where: { id, tenantId: ctx.tenantId },
    include: {
      creator: { select: { id: true, username: true, email: true } },
      files: {
        include: { file: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

async function createTransaction(ctx, payload) {
  ensureScope(ctx, "money", "write");
  
  // Generate invoice number if not provided
  let invoiceNo = payload.invoiceNo?.trim();
  if (!invoiceNo) {
    invoiceNo = await generateInvoiceNo(ctx.tenantId);
  } else {
    // Check uniqueness
    const existing = await prisma.transaction.findUnique({
      where: { invoiceNo },
    });
    if (existing && existing.tenantId !== ctx.tenantId) {
      throw new Error("Invoice number already exists");
    }
  }

  const data = {
    tenantId: ctx.tenantId,
    invoiceNo,
    date: payload.date ? new Date(payload.date) : new Date(),
    type: payload.type,
    category: payload.category?.trim(),
    description: payload.description?.trim() || null,
    amount: payload.amount,
    currency: payload.currency || "USD",
    paymentMethod: payload.paymentMethod,
    comment: payload.comment?.trim() || null,
    createdBy: ctx.userId,
  };

  if (!data.category) throw new Error("Category is required");
  if (!data.type || !["Revenue", "Expense"].includes(data.type)) {
    throw new Error("Type must be Revenue or Expense");
  }

  const transaction = await prisma.transaction.create({ data });
  await audit(ctx, "transaction.create", "Transaction", transaction.id, { new: transaction });
  return transaction;
}

async function updateTransaction(ctx, id, payload) {
  ensureScope(ctx, "money", "write");
  const existing = await prisma.transaction.findFirstOrThrow({
    where: { id, tenantId: ctx.tenantId },
  });

  const data = {};
  if (payload.date !== undefined) data.date = new Date(payload.date);
  if (payload.type !== undefined) data.type = payload.type;
  if (payload.category !== undefined) data.category = payload.category?.trim();
  if (payload.description !== undefined) data.description = payload.description?.trim() || null;
  if (payload.amount !== undefined) data.amount = payload.amount;
  if (payload.currency !== undefined) data.currency = payload.currency;
  if (payload.paymentMethod !== undefined) data.paymentMethod = payload.paymentMethod;
  if (payload.comment !== undefined) data.comment = payload.comment?.trim() || null;

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
  });
  
  await audit(ctx, "transaction.update", "Transaction", id, { old: existing, new: transaction });
  return transaction;
}

async function deleteTransaction(ctx, id) {
  ensureScope(ctx, "money", "write");
  await prisma.transaction.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  await audit(ctx, "transaction.delete", "Transaction", id, {});
  return { ok: true };
}

// File uploads
async function listTransactionFiles(ctx, transactionId) {
  ensureScope(ctx, "money", "read");
  await prisma.transaction.findFirstOrThrow({
    where: { id: transactionId, tenantId: ctx.tenantId },
  });

  const files = await prisma.transactionFile.findMany({
    where: { transactionId },
    include: { file: true },
    orderBy: { createdAt: "desc" },
  });

  return files;
}

async function uploadTransactionFile(ctx, transactionId, req) {
  ensureScope(ctx, "money", "write");
  await prisma.transaction.findFirstOrThrow({
    where: { id: transactionId, tenantId: ctx.tenantId },
  });

  const file = await uploadFormFile(ctx, req.file);
  
  const transactionFile = await prisma.transactionFile.create({
    data: {
      transactionId,
      fileId: file.id,
    },
  });

  await audit(ctx, "transaction.uploadFile", "Transaction", transactionId, { fileId: file.id });
  return transactionFile;
}

async function deleteTransactionFile(ctx, transactionId, transactionFileId) {
  ensureScope(ctx, "money", "write");
  const tf = await prisma.transactionFile.findFirstOrThrow({
    where: { id: transactionFileId, transactionId },
    include: { transaction: true, file: true },
  });

  if (tf.transaction.tenantId !== ctx.tenantId) {
    throw new Error("Unauthorized");
  }

  const fileSize = tf.file.size;
  await prisma.transactionFile.delete({ where: { id: transactionFileId } });
  await prisma.file.delete({ where: { id: tf.fileId } });
  
  // Decrement storage usage
  const { decrementStorageUsage } = require("../../utils/fileHandler.js");
  await decrementStorageUsage(ctx.tenantId, fileSize);
  
  await audit(ctx, "transaction.deleteFile", "Transaction", transactionId, { fileId: tf.fileId });
  return { ok: true };
}

// Statistics and charts
async function getStats(ctx, { startDate, endDate, type, category, paymentMethod }) {
  ensureScope(ctx, "money", "read");
  
  const where = { tenantId: ctx.tenantId };
  if (type) where.type = type;
  if (category) where.category = category;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      type: true,
      category: true,
      paymentMethod: true,
      amount: true,
      currency: true,
      date: true,
    },
  });

  // Category distribution
  const categoryData = {};
  transactions.forEach((t) => {
    categoryData[t.category] = (categoryData[t.category] || 0) + Number(t.amount);
  });

  // Payment method distribution
  const paymentData = {};
  transactions.forEach((t) => {
    paymentData[t.paymentMethod] = (paymentData[t.paymentMethod] || 0) + Number(t.amount);
  });

  // Top 5 expenses vs income (by category)
  const incomeByCategory = {};
  const expenseByCategory = {};
  transactions.forEach((t) => {
    const amt = Number(t.amount);
    if (t.type === "Revenue") {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + amt;
    } else {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + amt;
    }
  });

  const top5Expenses = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  const top5Income = Object.entries(incomeByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // Income vs Outcome over time (grouped by date)
  const timeSeries = {};
  transactions.forEach((t) => {
    const dateKey = t.date.toISOString().split("T")[0];
    if (!timeSeries[dateKey]) {
      timeSeries[dateKey] = { income: 0, expense: 0, date: dateKey };
    }
    const amt = Number(t.amount);
    if (t.type === "Revenue") {
      timeSeries[dateKey].income += amt;
    } else {
      timeSeries[dateKey].expense += amt;
    }
  });

  const incomeVsOutcome = Object.values(timeSeries)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      income: d.income,
      expense: d.expense,
    }));

  return {
    categoryDistribution: Object.entries(categoryData).map(([category, amount]) => ({
      category,
      amount,
    })),
    paymentMethodDistribution: Object.entries(paymentData).map(([method, amount]) => ({
      method,
      amount,
    })),
    top5Expenses,
    top5Income,
    incomeVsOutcome,
  };
}

// Export with running balances
async function exportTransactions(ctx, { startDate, endDate, type, category, paymentMethod, format = "csv" }) {
  ensureScope(ctx, "money", "read");
  
  const where = { tenantId: ctx.tenantId };
  if (type) where.type = type;
  if (category) where.category = category;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      creator: { select: { username: true, email: true } },
    },
    orderBy: { date: "asc" },
  });

  let runningBalance = 0;
  const exportData = transactions.map((t) => {
    const amount = Number(t.amount);
    if (t.type === "Revenue") {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }

    return {
      "Invoice No": t.invoiceNo,
      Date: t.date.toISOString().split("T")[0],
      Type: t.type,
      Category: t.category,
      Description: t.description || "",
      Amount: amount,
      Currency: t.currency,
      "Payment Method": t.paymentMethod,
      Comment: t.comment || "",
      "Running Balance": runningBalance,
      "Created By": t.creator.username || t.creator.email,
      "Created At": t.createdAt.toISOString(),
    };
  });

  return { data: exportData, format };
}

function toOrder(sort) {
  const [field, dir] = (sort || "date:desc").split(":");
  const direction = dir?.toLowerCase() === "asc" ? "asc" : "desc";
  return { [field]: direction };
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactionFiles,
  uploadTransactionFile,
  deleteTransactionFile,
  getStats,
  exportTransactions,
};

