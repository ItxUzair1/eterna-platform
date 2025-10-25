// server/src/scripts/seedRoles.js
const { prisma } = require("../config/db.js");

async function main() {
  await prisma.role.createMany({
    data: [
      { name: "Admin", description: "Full access" },
      { name: "Member", description: "Standard user" },
    ],
  });
  console.log("Roles seeded!");
}

main().finally(() => prisma.$disconnect());
