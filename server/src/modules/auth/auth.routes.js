const express = require("express");
const { registerUser, loginUser } =require("./auth.controller.js");
const router = express.Router();

router.post("/signup", registerUser);
router.post("/signin", loginUser);

module.exports=router
