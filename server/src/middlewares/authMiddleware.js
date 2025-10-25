const jwt =require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const permit = (...roles) => {
  return async (req, res, next) => {
    const roleId = req.user.roleId;
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roles.includes(role.name)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

module.exports={verifyToken,permit}