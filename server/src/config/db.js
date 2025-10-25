const path = require('path');
// Load environment variables from server/.env so runtime scripts (seed, migrations)
// using Prisma can find DATABASE_URL when run with `node` (not via prisma CLI).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = { prisma };
