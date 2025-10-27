const multer = require('multer');
const path = require('path');
const fs = require('fs');

const base = path.join(process.cwd(), 'uploads/kanban');
if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, base),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${unique}-${safe}`);
  }
});

module.exports = multer({ storage });
