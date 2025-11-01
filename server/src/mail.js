// node scripts/check-mail-account.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const tenantId = 3; // replace with the JWT tenant you expect
  const account = await prisma.mailAccount.findFirst({ where: { tenantId } });
  console.log({ tenantId, found: !!account, account });
  await prisma.$disconnect();
})();
