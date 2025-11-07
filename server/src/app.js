const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./modules/auth/auth.routes');
const emailRoutes = require('./modules/email/email.routes');
const todoRoutes = require('./modules/todo/todo.routes');
const kanbanRoutes = require('./modules/kanban/kanban.routes');
const crmRoutes = require("./modules/crm/crm.routes");
const googlesheetsRoutes = require("./modules/googlesheets/googlesheets.routes");
const moneyRoutes = require("./modules/money/money.routes");
const imageRoutes = require('./modules/image/image.routes');
const permissionsRoutes = require('./modules/permissions/permissions.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const teamRoutes = require('./routes/teamRoutes');
const auditRoutes = require('./routes/auditRoutes');
const billingStatusRoutes = require('./routes/billingStatus');

dotenv.config();
const billingWebhook = require('./billing/webhook');

const app = express();

// Stripe webhook must be before json parser
app.use('/api/billing', billingWebhook);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => res.send('Hello, Eterna Platform!'));

app.use('/api/todos', todoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/billing', require('./billing/routes'));
app.use('/api/kanban', kanbanRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/googlesheets", googlesheetsRoutes);
app.use("/api/money", moneyRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api', billingStatusRoutes);

module.exports = app;
