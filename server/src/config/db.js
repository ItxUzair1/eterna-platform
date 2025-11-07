const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? [ 'info',] : ['error'],
});
process.on('beforeExit', async () => prisma.$disconnect());
module.exports = prisma;
