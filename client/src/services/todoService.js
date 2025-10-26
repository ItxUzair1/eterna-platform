import api from "./api";

export const todoService = {
  getTodos: async (params) => {
    const res = await api.get('/todos', { params });
    return Array.isArray(res.data?.data) ? res.data.data : [];
  },
  getCategories: async () => {
    const res = await api.get('/todos/categories');
    return Array.isArray(res.data?.data) ? res.data.data : [];
  },
  createTodo: (data) => api.post('/todos', data).then(r => r.data),
  updateTodo: (id, data) => api.patch(`/todos/${id}`, data).then(r => r.data),
  deleteTodo: (id) => api.delete(`/todos/${id}`).then(r => r.data),
  bulkDelete: (ids) => api.post('/todos/bulk-delete', { ids }).then(r => r.data),
  bulkUpdateStatus: (ids, status) => api.post('/todos/bulk-update-status', { ids, status }).then(r => r.data),

  createCategory: (data) => api.post('/todos/categories', data).then(r => r.data),
  updateCategory: (id, data) => api.patch(`/todos/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id) => api.delete(`/todos/categories/${id}`).then(r => r.data),
};
