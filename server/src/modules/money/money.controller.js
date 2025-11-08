// server/src/modules/money/money.controller.js
const svc = require("./money.service");
const { createNotification } = require('../../utils/notify');

async function listTransactions(req, res, next) {
  try {
    const ctx = req.context;
    const { q, type, category, paymentMethod, startDate, endDate, page = 1, pageSize = 20, sort = "date:desc" } = req.query;
    const result = await svc.listTransactions(ctx, { q, type, category, paymentMethod, startDate, endDate, page: +page, pageSize: +pageSize, sort });
    res.json(result);
  } catch (e) { next(e); }
}

async function getTransaction(req, res, next) {
  try {
    const ctx = req.context;
    const transaction = await svc.getTransaction(ctx, +req.params.id);
    res.json(transaction);
  } catch (e) { next(e); }
}

async function createTransaction(req, res, next) {
  try {
    const ctx = req.context;
    const transaction = await svc.createTransaction(ctx, req.body);
    await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'success',
      title: 'Transaction added',
      message: `${transaction.type || 'Transaction'} recorded for ${transaction.amount}.`,
      data: { transactionId: transaction.id }
    });
    res.status(201).json(transaction);
  } catch (e) { next(e); }
}

async function updateTransaction(req, res, next) {
  try {
    const ctx = req.context;
    const transaction = await svc.updateTransaction(ctx, +req.params.id, req.body);
    await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'info',
      title: 'Transaction updated',
      message: 'A transaction record has been updated.',
      data: { transactionId: transaction.id }
    });
    res.json(transaction);
  } catch (e) { next(e); }
}

async function deleteTransaction(req, res, next) {
  try {
    const ctx = req.context;
    await svc.deleteTransaction(ctx, +req.params.id);
    await createNotification({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      type: 'warning',
      title: 'Transaction deleted',
      message: 'A transaction record was removed.',
      data: { transactionId: Number(req.params.id) }
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function listTransactionFiles(req, res, next) {
  try {
    const ctx = req.context;
    const files = await svc.listTransactionFiles(ctx, +req.params.transactionId);
    res.json({ items: files });
  } catch (e) { next(e); }
}

async function uploadTransactionFile(req, res, next) {
  try {
    const ctx = req.context;
    const file = await svc.uploadTransactionFile(ctx, +req.params.transactionId, req);
    res.status(201).json(file);
  } catch (e) { next(e); }
}

async function deleteTransactionFile(req, res, next) {
  try {
    const ctx = req.context;
    await svc.deleteTransactionFile(ctx, +req.params.transactionId, +req.params.transactionFileId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function getStats(req, res, next) {
  try {
    const ctx = req.context;
    const { startDate, endDate, type, category, paymentMethod } = req.query;
    const stats = await svc.getStats(ctx, { startDate, endDate, type, category, paymentMethod });
    res.json(stats);
  } catch (e) { next(e); }
}

async function exportTransactions(req, res, next) {
  try {
    const ctx = req.context;
    const { startDate, endDate, type, category, paymentMethod, format = "csv" } = req.query;
    const result = await svc.exportTransactions(ctx, { startDate, endDate, type, category, paymentMethod, format });
    res.json(result);
  } catch (e) { next(e); }
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

