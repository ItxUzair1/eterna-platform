const prisma = require('../../config/db');
const { checkStorageLimit, incrementStorageUsage } = require('../../utils/fileHandler');

async function createCard({ boardId, columnId, title, userId, parentCardId = null }) {
  const max = await prisma.card.aggregate({
    _max: { sortIndex: true },
    where: { boardId, columnId }
  });
  const next = (max._max.sortIndex ?? 0) + 1000;

  return prisma.card.create({
    data: {
      boardId,
      columnId,
      parentCardId,
      title,
      sortIndex: next,
      createdBy: userId
    }
  });
}

async function updateCard({ cardId, data }) {
  return prisma.card.update({
    where: { id: cardId },
    data
  });
}

async function deleteCard({ cardId }) {
  return prisma.card.delete({ where: { id: cardId } });
}

async function moveCard({ cardId, toColumnId, toIndex }) {
  // Reindex target column with gaps of 1000, then place card at position
  const targetCards = await prisma.card.findMany({
    where: { columnId: toColumnId },
    orderBy: { sortIndex: 'asc' }
  });

  const base = 1000;
  const updates = [];

  // Insert placeholder sortIndex at toIndex
  targetCards.splice(toIndex, 0, { id: cardId, sortIndex: 0 });

  updates.push(
    prisma.card.update({
      where: { id: cardId },
      data: { columnId: toColumnId }
    })
  );

  targetCards.forEach((c, idx) => {
    if (!c.id) return;
    updates.push(prisma.card.update({ where: { id: c.id }, data: { sortIndex: (idx + 1) * base } }));
  });

  await prisma.$transaction(updates);
  return { ok: true };
}

async function reorderCardsSameColumn({ columnId, orderedIds }) {
  const updates = orderedIds.map((id, idx) =>
    prisma.card.update({ where: { id }, data: { sortIndex: (idx + 1) * 1000 } })
  );
  await prisma.$transaction(updates);
  return { ok: true };
}

async function addComment({ cardId, userId, body }) {
  return prisma.cardComment.create({
    data: { cardId, authorId: userId, body }
  });
}

async function listComments(cardId) {
  return prisma.cardComment.findMany({
    where: { cardId },
    include: { author: true },
    orderBy: { createdAt: 'asc' }
  });
}

async function attachFile({ tenantId, userId, cardId, path, mime, size }) {
  // Check storage limit before creating file record
  await checkStorageLimit(tenantId, size);

  const file = await prisma.file.create({
    data: { tenantId, ownerId: userId, path, mime, size }
  });
  await prisma.cardFile.create({
    data: { cardId, fileId: file.id }
  });

  // Increment storage usage
  await incrementStorageUsage(tenantId, size);

  return { fileId: file.id };
}

module.exports = {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  reorderCardsSameColumn,
  addComment,
  listComments,
  attachFile
};
