const svc = require('./column.service');

const createColumn = async (req, res) => {
  const { boardId, title } = req.body;
  const col = await svc.createColumn({ boardId, title });
  res.json(col);
};

const updateColumn = async (req, res) => {
  const { title } = req.body;
  const columnId = Number(req.params.id);
  const col = await svc.updateColumn({ columnId, title });
  res.json(col);
};

const deleteColumn = async (req, res) => {
  const columnId = Number(req.params.id);
  const r = await svc.deleteColumn({ columnId });
  res.json(r);
};

const reorderColumns = async (req, res) => {
  const { boardId, orderedIds } = req.body; // ordered column IDs
  const r = await svc.reorderColumns(boardId, orderedIds);
  res.json(r);
};

module.exports = { createColumn, updateColumn, deleteColumn, reorderColumns };
