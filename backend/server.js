'use strict';
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');
const Database   = require('better-sqlite3');
const { optionalAuth } = require('./middleware/auth');

// ── Config ─────────────────────────────────────────────────
const PORT     = process.env.PORT || 3001;
const DB_PATH  = path.resolve(process.env.DB_PATH || './data/aethervex.db');
const ORIGINS  = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());

// ── Database ───────────────────────────────────────────────
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Auto-init DB if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  console.log('📦 First run — initialising database...');
  try {
    require('./scripts/init-db');
  } catch (e) {
    console.error('DB init error:', e.message);
  }
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
console.log('✅ Database connected:', DB_PATH);

// ── Express ────────────────────────────────────────────────
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin (origin, cb) {
    // Allow null origin (file://, curl) and configured origins
    if (!origin || ORIGINS.includes(origin) || ORIGINS.includes('*')) return cb(null, true);
    cb(new Error('CORS: ' + origin + ' not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(optionalAuth);

// Rate limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas requisições. Tente novamente em um minuto.' },
});
app.use('/api',   apiLimiter);
app.use('/store', apiLimiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/cosmetics', require('./routes/cosmetics')(db));
app.use('/api/user',      require('./routes/users')(db));
app.use('/store',         require('./routes/store')(db));

// /status alias (used by launcher ping)
app.get('/status', (_req, res) => res.json({ status: 'online', version: '1.0.0' }));

// ── 404 ────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// ── Error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   AetherVex Backend  v1.0.0         ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝

  Rotas disponíveis:
    GET  /status
    GET  /api/cosmetics
    GET  /api/cosmetics/:id
    POST /api/user/register
    POST /api/user/login
    GET  /api/user/inventory?userId=X
    POST /api/user/equip
    POST /store/redeem
    POST /store/purchase
  `);
});

module.exports = app; // for testing
