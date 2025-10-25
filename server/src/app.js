const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const authRoutes = require("./modules/auth/auth.routes.js");
const userRoutes = require("./modules/users/user.routes.js");
const roleRoutes =require("./modules/roles/role.routes.js");
dotenv.config()

const app = express()

app.use(cors())
app.use(express.json(express.urlencoded({ extended: true })))

app.use("/api/auth",authRoutes)
app.use("/api/users",userRoutes)
app.use("/api/roles",roleRoutes)


app.get("/", (req, res) => {
  res.send("Hello, Eterna Platform!")
})


module.exports = app;



