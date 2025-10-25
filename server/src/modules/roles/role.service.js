// src/modules/role/role.service.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllRoles = async () => {
  return prisma.role.findMany();
};

const createRole = async (data) => {
  return prisma.role.create({ data });
};

const getRoleById = async (id) => {
  return prisma.role.findUnique({ where: { id: Number(id) } });
};

const updateRole = async (id, data) => {
  return prisma.role.update({
    where: { id: Number(id) },
    data,
  });
};

const deleteRole = async (id) => {
  return prisma.role.delete({ where: { id: Number(id) } });
};

module.exports = {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
};
