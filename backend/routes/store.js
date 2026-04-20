'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = function (db) {

  // ── GET /store/status ──────────────────────────────────
  router.get('/status', (_req, res) => {
    res.json({ status: 'online', version: '1.0.0', ts: Date.now() });
  });

  // ── POST /store/redeem — validate & apply redeem code ─
  router.post('/redeem', (req, res) => {
    try {
      const { code, userId } = req.body;
      if (!code || code.length < 8)
        return res.status(400).json({ success: false, message: 'Código inválido.' });

      const normalised = code.toUpperCase().trim();

      // Lookup code
      const row = db.prepare('SELECT * FROM redeem_codes WHERE code = ?').get(normalised);
      if (!row) return res.json({ success: false, message: 'Código não encontrado.' });
      if (row.used) return res.json({ success: false, message: 'Código já utilizado.' });

      // Check expiry
      if (row.expires_at && row.expires_at < Math.floor(Date.now() / 1000)) {
        return res.json({ success: false, message: 'Código expirado.' });
      }

      // Find or create user
      let user = db.prepare('SELECT * FROM users WHERE username = ? OR id = ?').get(userId, userId);
      if (!user) {
        // Auto-create lightweight user
        const id = uuidv4();
        db.prepare(`INSERT INTO users (id, username, role, coins) VALUES (?, ?, 'MEMBER', 0)`)
          .run(id, userId || 'player_' + id.substring(0, 8));
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      }

      // Grant cosmetic
      db.prepare(`
        INSERT OR IGNORE INTO user_inventory (user_id, cosmetic_id, equipped, obtained_at)
        VALUES (?, ?, 0, unixepoch())
      `).run(user.id, row.cosmetic_id);

      // Mark code used
      db.prepare(`
        UPDATE redeem_codes SET used = 1, used_by = ?, used_at = unixepoch()
        WHERE code = ?
      `).run(user.id, normalised);

      // Get cosmetic name for response
      const cosm = db.prepare('SELECT name FROM cosmetics WHERE id = ?').get(row.cosmetic_id);

      res.json({
        success: true,
        message: `✅ ${cosm?.name || row.cosmetic_id} resgatado com sucesso!`,
        item:    cosm?.name || row.cosmetic_id,
        itemId:  row.cosmetic_id,
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Erro interno: ' + e.message });
    }
  });

  // ── POST /api/purchase — simulate purchase & generate code ─
  router.post('/purchase', (req, res) => {
    try {
      const { userId, cosmeticId } = req.body;
      if (!userId || !cosmeticId)
        return res.status(400).json({ error: 'userId e cosmeticId são obrigatórios.' });

      const cosm = db.prepare('SELECT * FROM cosmetics WHERE id = ?').get(cosmeticId);
      if (!cosm) return res.status(404).json({ error: 'Cosmético não encontrado.' });

      // Generate unique 16-char redeem code  e.g. AE8X-4Q91-MNZK-3T7F
      const raw  = uuidv4().replace(/-/g, '').toUpperCase().substring(0, 16);
      const code = `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`;

      // Store code (expires in 7 days)
      db.prepare(`
        INSERT INTO redeem_codes (code, cosmetic_id, expires_at)
        VALUES (?, ?, ?)
      `).run(code, cosmeticId, Math.floor(Date.now() / 1000) + 7 * 86400);

      // Record purchase
      const purchaseId = uuidv4();
      db.prepare(`
        INSERT INTO purchases (id, user_id, cosmetic_id, amount, currency, status)
        VALUES (?, ?, ?, ?, 'BRL', 'completed')
      `).run(purchaseId, userId, cosmeticId, cosm.price);

      res.json({
        success:    true,
        redeemCode: code,
        cosmetic:   { id: cosm.id, name: cosm.name, rarity: cosm.rarity },
        message:    `Insira o código "${code}" no launcher para resgatar.`,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Admin: generate batch codes (protected, dev only) ──
  router.post('/admin/generate-codes', (req, res) => {
    if (process.env.NODE_ENV === 'production')
      return res.status(403).json({ error: 'Forbidden' });

    try {
      const { cosmeticId, count = 5 } = req.body;
      if (!cosmeticId) return res.status(400).json({ error: 'cosmeticId obrigatório.' });

      const codes = [];
      const insert = db.prepare(
        'INSERT INTO redeem_codes (code, cosmetic_id) VALUES (?, ?)'
      );
      const insertBatch = db.transaction(() => {
        for (let i = 0; i < count; i++) {
          const raw  = uuidv4().replace(/-/g, '').toUpperCase().substring(0, 16);
          const code = `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`;
          insert.run(code, cosmeticId);
          codes.push(code);
        }
      });
      insertBatch();
      res.json({ success: true, codes });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
