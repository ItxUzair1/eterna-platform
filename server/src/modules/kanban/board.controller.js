const svc = require('./board.service');

const listBoards = async (req, res) => {
  const rows = await svc.listBoards(req.user.tenantId);
  res.json(rows);
};

const createBoard = async (req, res) => {
  const { title, teamId } = req.body;
  const row = await svc.createBoard({ tenantId: req.user.tenantId, userId: req.user.id, title, teamId });
  res.json(row);
};

const getBoardFull = async (req, res) => {
  const boardId = Number(req.params.id);
  const data = await svc.getBoardFull(req.user.tenantId, boardId);
  res.json(data);
};

const updateBoard = async (req, res) => {
  const boardId = Number(req.params.id);
  const { title, teamId } = req.body;
  const data = await svc.updateBoard({ 
    tenantId: req.user.tenantId, 
    boardId, 
    data: { title, teamId } 
  });
  res.json(data);
};

const archiveBoard = async (req, res) => {
  const boardId = Number(req.params.id);
  const data = await svc.archiveBoard({ tenantId: req.user.tenantId, boardId });
  res.json(data);
};

module.exports = { listBoards, createBoard, getBoardFull, updateBoard, archiveBoard };
