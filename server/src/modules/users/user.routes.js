// src/modules/user/user.routes.js
const express = require("express");
const userController = require("./user.controller");
const { verifyToken, permit } = require("../../middlewares/authMiddleware.js");

const router = express.Router();

// ✅ Only Admins can get all users
router.get("/", verifyToken, permit("Admin"), userController.getAllUsers);

// ✅ Only Admins can create new users
router.post("/", verifyToken, permit("Admin"), userController.createUser);

// ✅ Everyone can get their own profile, but only Admin can get others’ by ID
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    // if logged-in user is requesting their own profile OR admin, allow
    if (req.user.role === "Admin" || Number(req.user.id) === Number(req.params.id)) {
      return userController.getUserById(req, res);
    }
    return res.status(403).json({ message: "Forbidden: Access denied" });
  } catch (error) {
    next(error);
  }
});

// ✅ Only Admin can update users
router.put("/:id", verifyToken, permit("Admin"), userController.updateUser);

// ✅ Only Admin can delete users
router.delete("/:id", verifyToken, permit("Admin"), userController.deleteUser);

module.exports = router;
