const todoService = require('./todo.service');
const { successResponse, errorResponse } = require("../../utils/responseHandler");

class TodoController {
  async getTodos(req, res) {
    try {
      const { categoryId, status, search } = req.query;
      const { tenantId, userId } = req.user;

      const todos = await todoService.getTodos(tenantId, userId, {
        categoryId,
        status,
        search,
      });

      return successResponse(res, todos, 'Todos fetched successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  async getTodoById(req, res) {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.user;

      const todo = await todoService.getTodoById(id, tenantId, userId);
      return successResponse(res, todo, 'Todo fetched successfully');
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async createTodo(req, res) {
    try {
    console.log("Decoded user:", req.user);
    console.log("Incoming todo data:", req.body);
      const { tenantId, userId } = req.user;
      const todoData = { ...req.body, tenantId, userId };

      const todo = await todoService.createTodo(todoData);
      return successResponse(res, todo, 'Todo created successfully', 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async updateTodo(req, res) {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.user;

      const todo = await todoService.updateTodo(id, tenantId, userId, req.body);
      return successResponse(res, todo, 'Todo updated successfully');
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async deleteTodo(req, res) {
    try {
      const { id } = req.params;
      const { tenantId, userId } = req.user;

      await todoService.deleteTodo(id, tenantId, userId);
      return successResponse(res, null, 'Todo deleted successfully');
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const { tenantId, userId } = req.user;

      await todoService.bulkDelete(ids, tenantId, userId);
      return successResponse(res, null, `${ids.length} todos deleted successfully`);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async bulkUpdateStatus(req, res) {
    try {
      const { ids, status } = req.body;
      const { tenantId, userId } = req.user;

      await todoService.bulkUpdateStatus(ids, status, tenantId, userId);
      return successResponse(res, null, `${ids.length} todos updated successfully`);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Categories
  async getCategories(req, res) {
    try {
      const { tenantId } = req.user;
      const categories = await todoService.getCategories(tenantId);
      return successResponse(res, categories, 'Categories fetched successfully');
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  async createCategory(req, res) {
    try {
        
      const { tenantId } = req.user;
      const categoryData = { ...req.body, tenantId };
      const category = await todoService.createCategory(categoryData);
      return successResponse(res, category, 'Category created successfully', 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { tenantId } = req.user;

      const category = await todoService.updateCategory(id, tenantId, req.body);
      return successResponse(res, category, 'Category updated successfully');
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const { tenantId } = req.user;

      await todoService.deleteCategory(id, tenantId);
      return successResponse(res, null, 'Category deleted successfully');
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new TodoController();
