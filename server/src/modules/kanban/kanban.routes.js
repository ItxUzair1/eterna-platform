const express = require('express');
const { verifyToken } = require('../../middlewares/authMiddleware');

const board = require('./board.controller');
const column = require('./column.controller');
const card = require('./card.controller');

const router = express.Router();

// Boards
router.get('/boards', verifyToken, board.listBoards);
router.post('/boards', verifyToken, board.createBoard);
router.get('/boards/:id', verifyToken, board.getBoardFull);
router.patch('/boards/:id', verifyToken, board.updateBoard);
router.post('/boards/:id/archive', verifyToken, board.archiveBoard);

// Columns
router.post('/columns', verifyToken, column.createColumn);
router.patch('/columns/:id', verifyToken, column.updateColumn);
router.delete('/columns/:id', verifyToken, column.deleteColumn);
router.post('/columns/reorder', verifyToken, column.reorderColumns);

// Cards
router.post('/cards', verifyToken, card.createCard);
router.patch('/cards/:id', verifyToken, card.updateCard);
router.delete('/cards/:id', verifyToken, card.deleteCard);
router.post('/cards/move', verifyToken, card.moveCard);
router.post('/cards/reorder', verifyToken, card.reorderCards);

// Comments
router.post('/cards/comments', verifyToken, card.addComment);
router.get('/cards/:cardId/comments', verifyToken, card.listComments);

// Attachments
router.post('/cards/attach', verifyToken, card.attachFile);

module.exports = router;
