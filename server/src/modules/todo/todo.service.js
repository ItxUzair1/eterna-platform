// server/src/modules/todo/todo.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TodoService {
  async getTodos(tenantId, userId, filters = {}) {
    const { categoryId, status, search } = filters;

    const where = {
      tenantId,
      createdBy: userId, // align to SRS
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } }, // description -> notes
            ],
          }
        : {}),
    };

    return prisma.todo.findMany({
      where,
      include: { category: true },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getTodoById(id, tenantId, userId) {
    const todo = await prisma.todo.findFirst({
      where: { id: Number(id), tenantId, userId },
      include: { category: true },
    });
    if (!todo) throw new Error('Todo not found');
    return todo;
  }

  async createTodo(data) {
  const {
    tenantId,
    userId,
    categoryId,
    title,
    description,
    status,
    priority,
    assignedDate,
    dueDate,
  } = data;

  // Ensure category belongs to same tenant
  if (categoryId) {
    const category = await prisma.todoCategory.findFirst({
      where: { id: Number(categoryId), tenantId },
      select: { id: true },
    });
    if (!category) {
      throw new Error('Category not found for this tenant');
    }
  }

  return prisma.todo.create({
    data: {
      title,
      description: description ?? null, // ✅ FIXED
      status,
      ...(priority ? { priority } : {}),
      assignedDate: assignedDate || new Date(),
      dueDate: dueDate || null,
      tenant: { connect: { id: tenantId } },
      user: { connect: { id: userId } },     
      ...(categoryId && {
        category: { connect: { id: Number(categoryId) } }, // optional
      }),
    },
    include: { category: true },
  });
}


  async updateTodo(id, tenantId, userId, data) {
  const { tenantId: _t, userId: _u, ...safe } = data;

  if (safe.categoryId !== undefined && safe.categoryId !== null) {
    // Only validate category if a new ID is provided
    const ok = await prisma.todoCategory.findFirst({
      where: { id: Number(safe.categoryId), tenantId },
      select: { id: true },
    });
    console.log("passed")
    if (!ok) throw new Error('Category not found for this tenant');
  }

  const todo = await this.getTodoById(id, tenantId, userId);

  return prisma.todo.update({
    where: { id: todo.id },
    data: {
      ...(safe.title !== undefined ? { title: safe.title } : {}),
      ...(safe.description !== undefined ? { description: safe.description } : {}),
      ...(safe.status !== undefined ? { status: safe.status } : {}),
      ...(safe.priority !== undefined ? { priority: safe.priority } : {}),
      ...(safe.assignedDate !== undefined ? { assignedDate: safe.assignedDate } : {}),
      ...(safe.dueDate !== undefined ? { dueDate: safe.dueDate } : {}),
      ...(safe.categoryId !== undefined
        ? safe.categoryId === null
          ? { category: { disconnect: true } } // allow un-setting
          : { category: { connect: { id: Number(safe.categoryId) } } }
        : {}),
    },
    include: { category: true },
  });
}


  async deleteTodo(id, tenantId, userId) {
    const todo = await this.getTodoById(id, tenantId, userId);
    await prisma.todo.delete({ where: { id: todo.id } });
  }

  async bulkDelete(ids, tenantId, userId) {
    return prisma.todo.deleteMany({
      where: {
        id: { in: ids.map(Number) },
        tenantId,
        createdBy: userId,
      },
    });
  }

  async bulkUpdateStatus(ids, status, tenantId, userId) {
    return prisma.todo.updateMany({
      where: {
        id: { in: ids.map(Number) },
        tenantId,
        createdBy: userId,
      },
      data: { status },
    });
  }

  // Categories

  async getCategories(tenantId) {
    return prisma.todoCategory.findMany({
      where: { tenantId },
      orderBy: { title: 'asc' },
    });
  }

  async createCategory(data) {
    const { tenantId, title, color } = data;
    // if relation required, connect tenant; keep tenantId too if you store scalar
    return prisma.todoCategory.create({
      data: {
        title,
        color,
        tenant: { connect: { id: tenantId } },
        tenantId,
      },
    });
  }

  async updateCategory(id, tenantId, data) {
    // if you don't have a composite unique (id, tenantId), fallback to updateMany
    return prisma.todoCategory.update({
      where: { id: Number(id) },
      data,
    });
  }

  async deleteCategory(id, tenantId) {
    const todosCount = await prisma.todo.count({
      where: { categoryId: Number(id), tenantId },
    });
    if (todosCount > 0) {
      throw new Error('Cannot delete category with existing todos');
    }
    await prisma.todoCategory.delete({
      where: { id: Number(id) },
    });
  }
}

module.exports = new TodoService();
