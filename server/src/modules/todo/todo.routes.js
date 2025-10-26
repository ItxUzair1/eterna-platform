const express = require('express');
const router = express.Router();
const todoController = require('./todo.controller');
const { verifyToken } = require('../../middlewares/authMiddleware');

router.use(verifyToken);

// Categories first or anywhere is fine
router.get('/categories', todoController.getCategories);
router.post('/categories', todoController.createCategory);
router.patch('/categories/:id', todoController.updateCategory);
router.delete('/categories/:id', todoController.deleteCategory);

// Todos
router.get('/', todoController.getTodos);
router.get('/:id', todoController.getTodoById);
router.post('/', todoController.createTodo);
router.patch('/:id', todoController.updateTodo);
router.delete('/:id', todoController.deleteTodo);
router.post('/bulk-delete', todoController.bulkDelete);
router.post('/bulk-update-status', todoController.bulkUpdateStatus);

module.exports = router;
