import api from './api';
;

export const crmApi = {
  listLeads: (params) => api.get("/crm/leads", { params }),
  getLead: (id) => api.get(`/crm/leads/${id}`),
  createLead: (payload) => api.post("/crm/leads", payload),
  updateLead: (id, payload) => api.put(`/crm/leads/${id}`, payload),
  deleteLeads: (ids) => api.post("/crm/leads/bulk-delete", { ids }),
  assignLeads: (ids, ownerId) => api.post("/crm/leads/assign", { ids, ownerId }),
  listStatuses: () => api.get("/crm/statuses"),
  upsertStatus: (payload) => api.post("/crm/statuses", payload),
  deleteStatus: (id) => api.delete(`/crm/statuses/${id}`),

  // Appointments
  listAppointments: (leadId) => api.get(`/crm/leads/${leadId}/appointments`),
  createAppointment: (leadId, payload) => api.post(`/crm/leads/${leadId}/appointments`, payload),
  updateAppointment: (leadId, id, payload) => api.put(`/crm/leads/${leadId}/appointments/${id}`, payload),
  deleteAppointment: (leadId, id) => api.delete(`/crm/leads/${leadId}/appointments/${id}`),

  // Files
  listFiles: (leadId) => api.get(`/crm/leads/${leadId}/files`),
  uploadFile: (leadId, file) => {
    const form = new FormData();
    form.append("file", file);
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.post(`/crm/leads/${leadId}/files`, form);
  },
  deleteFile: (leadId, leadFileId) => api.delete(`/crm/leads/${leadId}/files/${leadFileId}`),

  // Import
  importCsv: (file, mapping) => {
    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));
    return api.post("/crm/import/csv", form);
  },
};
