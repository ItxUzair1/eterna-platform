const svc = require('./card.service');
const { createNotification } = require('../../utils/notify');

const createCard = async (req, res) => {
  const { boardId, columnId, title, parentCardId } = req.body;
  const card = await svc.createCard({
    boardId,
    columnId,
    title,
    userId: req.user.id,
    parentCardId: parentCardId ?? null
  });
  await createNotification({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    type: 'success',
    title: 'Card created',
    message: `Card "${card.title}" was added to the board.`,
    data: { cardId: card.id, boardId }
  });
  res.json(card);
};

const updateCard = async (req, res) => {
  const cardId = Number(req.params.id);
  const data = req.body; // title, description, deadlineDate, assigneeId, etc.
  const card = await svc.updateCard({ cardId, data });
  const messageParts = [];
  if (data.title) messageParts.push('title updated');
  if (data.description) messageParts.push('description updated');
  if (data.deadlineDate) messageParts.push('due date set');
  if (data.assigneeId) messageParts.push('assignee changed');
  const message = messageParts.length ? messageParts.join(', ') : 'Card details updated';
  await createNotification({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    type: data.deadlineDate ? 'warning' : 'info',
    title: data.deadlineDate ? 'Card due date updated' : 'Card updated',
    message: data.deadlineDate ? `Due date set for "${card.title}".` : `"${card.title}" ${message}.`,
    data: { cardId }
  });
  res.json(card);
};

const deleteCard = async (req, res) => {
  const cardId = Number(req.params.id);
  const r = await svc.deleteCard({ cardId });
  await createNotification({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    type: 'warning',
    title: 'Card deleted',
    message: 'A card was removed from the board.',
    data: { cardId }
  });
  res.json(r);
};

const moveCard = async (req, res) => {
  const { cardId, toColumnId, toIndex } = req.body;
  const r = await svc.moveCard({ cardId, toColumnId, toIndex });
  await createNotification({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    type: 'info',
    title: 'Card moved',
    message: 'A card was moved to a new column.',
    data: { cardId, columnId: toColumnId }
  });
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
  await createNotification({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    type: 'info',
    title: 'New card comment',
    message: 'A new comment was added to a card.',
    data: { cardId }
  });
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
    await createNotification({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      type: 'info',
      title: 'Attachment uploaded',
      message: 'A file was attached to a card.',
      data: { cardId: Number(cardId) }
    });
    res.json(r);
  }
];

module.exports = {
  createCard, updateCard, deleteCard, moveCard, reorderCards,
  addComment, listComments, attachFile
};
