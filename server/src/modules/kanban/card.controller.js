const svc = require('./card.service');

const createCard = async (req, res) => {
  const { boardId, columnId, title, parentCardId } = req.body;
  const card = await svc.createCard({
    boardId,
    columnId,
    title,
    userId: req.user.id,
    parentCardId: parentCardId ?? null
  });
  res.json(card);
};

const updateCard = async (req, res) => {
  const cardId = Number(req.params.id);
  const data = req.body; // title, description, deadlineDate, assigneeId, etc.
  const card = await svc.updateCard({ cardId, data });
  res.json(card);
};

const deleteCard = async (req, res) => {
  const cardId = Number(req.params.id);
  const r = await svc.deleteCard({ cardId });
  res.json(r);
};

const moveCard = async (req, res) => {
  const { cardId, toColumnId, toIndex } = req.body;
  const r = await svc.moveCard({ cardId, toColumnId, toIndex });
  res.json(r);
};

const reorderCards = async (req, res) => {
  const { columnId, orderedIds } = req.body;
  const r = await svc.reorderCardsSameColumn({ columnId, orderedIds });
  res.json(r);
};

const addComment = async (req, res) => {
  const { cardId, body } = req.body;
  const row = await svc.addComment({ cardId, userId: req.user.id, body });
  res.json(row);
};

const listComments = async (req, res) => {
  const cardId = Number(req.params.cardId);
  const rows = await svc.listComments(cardId);
  res.json(rows);
};

const upload = require('./upload');
const { getSignedDownloadUrl } = require('../../utils/spaces');

const attachFile = [
  upload.single('file'),
  async (req, res) => {
    const { cardId } = req.body;
    const { key, mimetype, size } = { key: req.file.key, mimetype: req.file.mimetype, size: req.file.size };
    const r = await svc.attachFile({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      cardId: Number(cardId),
      path: key,
      mime: mimetype,
      size
    });
    res.json(r);
  }
];

module.exports = {
  createCard, updateCard, deleteCard, moveCard, reorderCards,
  addComment, listComments, attachFile
};
