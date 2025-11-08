import api from './api';

export const moneyApi = {
  listTransactions: (params) => api.get("/money/transactions", { params }),
  getTransaction: (id) => api.get(`/money/transactions/${id}`),
  createTransaction: (payload) => api.post("/money/transactions", payload),
  updateTransaction: (id, payload) => api.put(`/money/transactions/${id}`, payload),
  deleteTransaction: (id) => api.delete(`/money/transactions/${id}`),

  // Files
  listFiles: (transactionId) => api.get(`/money/transactions/${transactionId}/files`),
  uploadFile: (transactionId, file) => {
    const form = new FormData();
    form.append("file", file);
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.post(`/money/transactions/${transactionId}/files`, form);
  },
  deleteFile: (transactionId, transactionFileId) => 
    api.delete(`/money/transactions/${transactionId}/files/${transactionFileId}`),

  // Statistics
  getStats: (params) => api.get("/money/stats", { params }),

  // Export
  exportTransactions: (params) => api.get("/money/export", { params }),
};

