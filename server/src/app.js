const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./modules/auth/auth.routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => res.send('Hello, Eterna Platform!'));

app.use('/api/auth', authRoutes);

// TODO: add user and role routes when ready
// const userRoutes = require('./modules/users/user.routes');
// const roleRoutes = require('./modules/roles/role.routes');
// app.use('/api/users', userRoutes);
// app.use('/api/roles', roleRoutes);

module.exports = app;
