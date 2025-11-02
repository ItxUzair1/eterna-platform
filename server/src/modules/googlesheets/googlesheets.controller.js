// server/src/modules/googlesheets/googlesheets.controller.js
const svc = require("./googlesheets.service.js");

async function listConnections(req, res, next) {
  try {
    const ctx = req.context;
    const connections = await svc.listConnections(ctx);
    res.json(connections);
  } catch (e) {
    next(e);
  }
}

async function getConnection(req, res, next) {
  try {
    const ctx = req.context;
    const connection = await svc.getConnection(ctx, +req.params.id);
    res.json(connection);
  } catch (e) {
    next(e);
  }
}

async function upsertConnection(req, res, next) {
  try {
    const ctx = req.context;
    const connection = await svc.upsertConnection(ctx, req.body);
    res.json(connection);
  } catch (e) {
    next(e);
  }
}

async function deleteConnection(req, res, next) {
  try {
    const ctx = req.context;
    await svc.deleteConnection(ctx, +req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function getSpreadsheetInfo(req, res, next) {
  try {
    const ctx = req.context;
    const { spreadsheetId, apiKey } = req.body;
    const info = await svc.getSpreadsheetInfo(ctx, spreadsheetId, apiKey);
    res.json(info);
  } catch (e) {
    next(e);
  }
}

async function getSheetHeaders(req, res, next) {
  try {
    const ctx = req.context;
    const { spreadsheetId, sheetName, apiKey } = req.body;
    const headers = await svc.getSheetHeaders(ctx, spreadsheetId, sheetName, apiKey);
    res.json(headers);
  } catch (e) {
    next(e);
  }
}

async function syncImport(req, res, next) {
  try {
    const ctx = req.context;
    const result = await svc.syncImport(ctx, +req.params.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function syncExport(req, res, next) {
  try {
    const ctx = req.context;
    const result = await svc.syncExport(ctx, +req.params.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function syncBidirectional(req, res, next) {
  try {
    const ctx = req.context;
    const result = await svc.syncBidirectional(ctx, +req.params.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listConnections,
  getConnection,
  upsertConnection,
  deleteConnection,
  getSpreadsheetInfo,
  getSheetHeaders,
  syncImport,
  syncExport,
  syncBidirectional,
};

