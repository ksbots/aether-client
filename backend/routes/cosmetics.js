'use strict';
const express = require('express');
const router  = express.Router();

module.exports = function (db) {

  /** GET /api/cosmetics — list all active cosmetics */
  router.get('/', (req, res) => {
    try {
      const { category, rarity, q } = req.query;
      let sql    = 'SELECT * FROM cosmetics WHERE active = 1';
      const args = [];
      if (category) { sql += ' AND category = ?'; args.push(category); }
      if (rarity)   { sql += ' AND rarity = ?';   args.push(rarity);   }
      if (q)        { sql += ' AND (name LIKE ? OR description LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
      sql += ' ORDER BY rarity, name';

      const rows = db.prepare(sql).all(...args);
      res.json({ success: true, count: rows.length, cosmetics: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/cosmetics/:id — single cosmetic */
  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM cosmetics WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Cosmético não encontrado.' });
    res.json({ success: true, cosmetic: row });
  });

  return router;
};
