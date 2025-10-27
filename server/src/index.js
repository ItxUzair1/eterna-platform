const app = require('./app');
const prisma = require('./config/db');

const PORT = process.env.PORT;

(async () => {
  try {
    await prisma.$connect();
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
})();
