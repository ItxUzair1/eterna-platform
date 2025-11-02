import api from './api';

export const googlesheetsApi = {
  listConnections: () => api.get("/googlesheets/connections").then(r => r.data),
  getConnection: (id) => api.get(`/googlesheets/connections/${id}`).then(r => r.data),
  createConnection: (payload) => api.post("/googlesheets/connections", payload).then(r => r.data),
  updateConnection: (id, payload) => api.put(`/googlesheets/connections/${id}`, payload).then(r => r.data),
  deleteConnection: (id) => api.delete(`/googlesheets/connections/${id}`).then(r => r.data),
  
  getSpreadsheetInfo: (spreadsheetId, apiKey) => 
    api.post("/googlesheets/spreadsheet-info", { spreadsheetId, apiKey }).then(r => r.data),
  
  getSheetHeaders: (spreadsheetId, sheetName, apiKey) => 
    api.post("/googlesheets/sheet-headers", { spreadsheetId, sheetName, apiKey }).then(r => r.data),
  
  syncImport: (id) => api.post(`/googlesheets/connections/${id}/sync/import`).then(r => r.data),
  syncExport: (id) => api.post(`/googlesheets/connections/${id}/sync/export`).then(r => r.data),
  syncBidirectional: (id) => api.post(`/googlesheets/connections/${id}/sync/bidirectional`).then(r => r.data),
};

