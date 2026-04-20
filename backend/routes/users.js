'use strict';
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, signToken } = require('../middleware/auth');

module.exports = function (db) {

  /** POST /api/user/register — create offline/username account */
  router.post('/register', (req, res) => {
    try {
      const { username, password, email } = req.body;
      if (!username || username.length < 3)
        return res.status(400).json({ error: 'Nome inválido (mínimo 3 caracteres).' });

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) return res.status(409).json({ error: 'Nome de usuário já em uso.' });

      const id   = uuidv4();
      const hash = password ? bcrypt.hashSync(password, 10) : null;

      db.prepare(`
        INSERT INTO users (id, username, email, password, role, coins)
        VALUES (?, ?, ?, ?, 'MEMBER', 0)
      `).run(id, username, email || null, hash);

      const token = signToken({ id, username, role: 'MEMBER' });
      res.json({ success: true, token, user: { id, username, role: 'MEMBER', coins: 0 } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/user/login */
  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
      if (user.password && !bcrypt.compareSync(password || '', user.password))
        return res.status(401).json({ error: 'Senha incorreta.' });

      const token = signToken({ id: user.id, username: user.username, role: user.role });
      res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, coins: user.coins } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/user/inventory?userId=:username — get equipped cosmetics */
  router.get('/inventory', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: 'userId obrigatório.' });

      // Find user by username or id
      const user = db.prepare('SELECT id FROM users WHERE username = ? OR id = ?').get(userId, userId);
      if (!user) return res.json({ success: true, items: [] });

      const rows = db.prepare(`
        SELECT ui.cosmetic_id as id, ui.equipped, c.name, c.category, c.rarity
        FROM user_inventory ui
        JOIN cosmetics c ON c.id = ui.cosmetic_id
        WHERE ui.user_id = ?
      `).all(user.id);

      res.json({
        success: true,
        items:    rows.map(r => r.id),
        equipped: rows.filter(r => r.equipped).map(r => r.id),
        details:  rows,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/user/equip — toggle equip state */
  router.post('/equip', (req, res) => {
    try {
      const { userId, cosmeticId, equipped } = req.body;
      if (!userId || !cosmeticId) return res.status(400).json({ error: 'Parâmetros ausentes.' });

      const user = db.prepare('SELECT id FROM users WHERE username = ? OR id = ?').get(userId, userId);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      const owns = db.prepare('SELECT id FROM user_inventory WHERE user_id = ? AND cosmetic_id = ?').get(user.id, cosmeticId);
      if (!owns) return res.status(403).json({ error: 'Cosmético não encontrado no inventário.' });

      db.prepare('UPDATE user_inventory SET equipped = ? WHERE user_id = ? AND cosmetic_id = ?')
        .run(equipped ? 1 : 0, user.id, cosmeticId);

      res.json({ success: true, equipped: !!equipped });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
