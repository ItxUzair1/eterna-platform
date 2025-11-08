import api from './api';

export const listBoards = () => api.get('/kanban/boards');
export const createBoard = (data) => api.post('/kanban/boards', data);
export const getBoardFull = (id) => api.get(`/kanban/boards/${id}`);
export const updateBoard = (id, data) => api.patch(`/kanban/boards/${id}`, data);

export const createColumn = (data) => api.post('/kanban/columns', data);
export const reorderColumns = (data) => api.post('/kanban/columns/reorder', data);
export const updateColumn = (id, data) => api.patch(`/kanban/columns/${id}`, data);
export const deleteColumn = (id) => api.delete(`/kanban/columns/${id}`);

export const createCard = (data) => api.post('/kanban/cards', data);
export const updateCard = (id, data) => api.patch(`/kanban/cards/${id}`, data);
export const deleteCard = (id) => api.delete(`/kanban/cards/${id}`);
export const moveCard = (data) => api.post('/kanban/cards/move', data);
export const reorderCards = (data) => api.post('/kanban/cards/reorder', data);

export const addComment = (data) => api.post('/kanban/cards/comments', data);
export const listComments = (cardId) => api.get(`/kanban/cards/${cardId}/comments`);

export const attachFile = async ({ cardId, file }) => {
  const form = new FormData();
  form.append('cardId', cardId);
  form.append('file', file);
  // Don't set Content-Type header - let axios set it automatically with boundary
  const { data } = await api.post('/kanban/cards/attach', form);
  return data;
};
