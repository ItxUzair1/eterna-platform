const prisma = require('../../config/db');

async function listBoards(tenantId) {
  return prisma.board.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

async function createBoard({ tenantId, userId, title, teamId = null }) {
  return prisma.board.create({
    data: {
      tenantId,
      title,
      teamId,
      createdBy: userId
    }
  });
}

// "Archive" via soft-delete or flag; using title suffix for MVP (or add archived boolean)
async function archiveBoard({ tenantId, boardId }) {
  const board = await prisma.board.update({
    where: { id: boardId },
    data: { title: { set: '[ARCHIVED] ' + Date.now() } }
  });
  return board;
}

async function getBoardFull(tenantId, boardId) {
  // Return columns/cards/comments/attachments for UI hydration
  return prisma.board.findFirst({
    where: { id: boardId, tenantId },
    include: {
      columns: {
        orderBy: { sortIndex: 'asc' }
      },
      cards: {
        include: {
          attachments: { include: { file: true } },
          comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
          subCards: true
        },
        orderBy: [{ columnId: 'asc' }, { sortIndex: 'asc' }]
      }
    }
  });
}

module.exports = { listBoards, createBoard, archiveBoard, getBoardFull };
