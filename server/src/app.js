const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./modules/auth/auth.routes');
const emailRoutes = require('./modules/email/email.routes');
const todoRoutes = require('./modules/todo/todo.routes');
const kanbanRoutes = require('./modules/kanban/kanban.routes');



dotenv.config();



const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => res.send('Hello, Eterna Platform!'));


app.use('/api/todos', todoRoutes);


app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/kanban', kanbanRoutes);

// TODO: add user and role routes when ready
// const userRoutes = require('./modules/users/user.routes');
// const roleRoutes = require('./modules/roles/role.routes');
// app.use('/api/users', userRoutes);
// app.use('/api/roles', roleRoutes);

module.exports = app;
