// src/modules/user/user.service.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllUsers = async () => {
  return prisma.user.findMany({
    include: { role: true, tenant: true },
  });
};

const createUser = async (data) => {
  return prisma.user.create({ data });
};

const getUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    include: { role: true },
  });
};

const updateUser = async (id, data) => {
  return prisma.user.update({
    where: { id: Number(id) },
    data,
  });
};

const deleteUser = async (id) => {
  return prisma.user.delete({ where: { id: Number(id) } });
};

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};
