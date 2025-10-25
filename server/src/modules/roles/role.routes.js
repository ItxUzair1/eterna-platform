// src/modules/role/role.routes.js
const express = require("express");
const roleController = require("./role.controller");

const router = express.Router();

router.get("/", roleController.getAllRoles);
router.post("/", roleController.createRole);
router.get("/:id", roleController.getRoleById);
router.put("/:id", roleController.updateRole);
router.delete("/:id", roleController.deleteRole);

module.exports = router;
