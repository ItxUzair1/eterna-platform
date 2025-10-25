// src/modules/role/role.controller.js
const roleService = require("./role.service");

const getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const newRole = await roleService.createRole(req.body);
    res.status(201).json(newRole);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const updatedRole = await roleService.updateRole(req.params.id, req.body);
    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
};
