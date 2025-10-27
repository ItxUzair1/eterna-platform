const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TodoService {
  async getTodos(tenantId, userId, filters = {}) {
    const { categoryId, status, search } = filters;

    const where = {
      tenantId,
      userId,
      ...(categoryId && { categoryId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return await prisma.todo.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getTodoById(id, tenantId, userId) {
    const todo = await prisma.todo.findFirst({
      where: { id, tenantId, userId },
      include: { category: true },
    });

    if (!todo) throw new Error('Todo not found');
    return todo;
  }

  async createTodo(data) {
    return await prisma.todo.create({
      data: {
        ...data,
        assignedDate: data.assignedDate || new Date(),
      },
      include: { category: true },
    });
  }

  async updateTodo(id, tenantId, userId, data) {
    const todo = await this.getTodoById(id, tenantId, userId);
    
    return await prisma.todo.update({
      where: { id: todo.id },
      data,
      include: { category: true },
    });
  }

  async deleteTodo(id, tenantId, userId) {
    const todo = await this.getTodoById(id, tenantId, userId);
    await prisma.todo.delete({ where: { id: todo.id } });
  }

  async bulkDelete(ids, tenantId, userId) {
    return await prisma.todo.deleteMany({
      where: {
        id: { in: ids },
        tenantId,
        userId,
      },
    });
  }

  async bulkUpdateStatus(ids, status, tenantId, userId) {
    return await prisma.todo.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        userId,
      },
      data: { status },
    });
  }

  // Categories
  async getCategories(tenantId) {
    return await prisma.todoCategory.findMany({
      where: { tenantId },
      orderBy: { title: 'asc' },
    });
  }

  async createCategory(data) {
    return await prisma.todoCategory.create({ data });
  }

  async updateCategory(id, tenantId, data) {
    return await prisma.todoCategory.update({
      where: { id, tenantId },
      data,
    });
  }

  async deleteCategory(id, tenantId) {
    // Check if category has todos
    const todosCount = await prisma.todo.count({
      where: { categoryId: id, tenantId },
    });

    if (todosCount > 0) {
      throw new Error('Cannot delete category with existing todos');
    }

    await prisma.todoCategory.delete({
      where: { id, tenantId },
    });
  }
}

module.exports = new TodoService();
