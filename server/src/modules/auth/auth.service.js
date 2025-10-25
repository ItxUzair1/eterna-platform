const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { prisma } = require("../../config/db.js")

const signup = async (data) => {
  const { email, username, password, role } = data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const userRole = await prisma.role.findFirst({ where: { name: role || "Member" } });

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash: hashed,
      roleId: userRole?.id || 2, // Default: Member
    },
  });

  return user;
};

const signin = async (data) => {
  const { email, password } = data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials");

  const token = jwt.sign(
    { id: user.id, roleId: user.roleId },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { user, token };
};

module.exports = {signin,signup}