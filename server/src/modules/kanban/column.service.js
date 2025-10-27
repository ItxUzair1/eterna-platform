const prisma = require('../../config/db');

async function createColumn({ boardId, title }) {
  // find next sortIndex
  const max = await prisma.column.aggregate({
    _max: { sortIndex: true },
    where: { boardId }
  });
  const next = (max._max.sortIndex ?? 0) + 1000; // gap for future inserts
  return prisma.column.create({
    data: { boardId, title, sortIndex: next }
  });
}

async function updateColumn({ columnId, title }) {
  return prisma.column.update({
    where: { id: columnId },
    data: { title }
  });
}

async function deleteColumn({ columnId }) {
  return prisma.column.delete({ where: { id: columnId } });
}

async function reorderColumns(boardId, orderedIds) {
  // Assign new sortIndex multiples of 1000 based on array order
  const updates = orderedIds.map((id, idx) =>
    prisma.column.update({ where: { id }, data: { sortIndex: (idx + 1) * 1000 } })
  );
  await prisma.$transaction(updates);
  return { ok: true };
}

module.exports = { createColumn, updateColumn, deleteColumn, reorderColumns };
