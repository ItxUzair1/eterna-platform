const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');

const signup = async (data) => {
  const { email, username, password, role = 'Entrepreneur' } = data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error('User already exists');

  const tenant = await prisma.tenant.create({ data: { name: `${username}'s Org` } });

  // Ensure role exists or fallback
  let userRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: role },
  });
  if (!userRole) {
    userRole = await prisma.role.create({
      data: { tenantId: tenant.id, name: role, description: `${role} role` },
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      username,
      passwordHash: hashed,
      roleId: userRole.id,
    },
    select: { id: true, tenantId: true, email: true, username: true, roleId: true, createdAt: true },
  });

  return user;
};

const signin = async ({ identifier, password }) => {
  // identifier can be email or username
  const user =
    (await prisma.user.findUnique({ where: { email: identifier } })) ||
    (await prisma.user.findUnique({ where: { username: identifier } }));

  if (!user) throw new Error('Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { id: user.id, tenantId: user.tenantId, roleId: user.roleId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Minimal safe payload back to client
  const safeUser = { id: user.id, tenantId: user.tenantId, email: user.email, username: user.username, roleId: user.roleId };

  return { user: safeUser, token };
};

module.exports = { signup, signin };
