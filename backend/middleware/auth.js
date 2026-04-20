'use strict';
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Optional auth — sets req.user if a valid Bearer token is present.
 * Routes that require auth should call requireAuth after this.
 */
function optionalAuth (req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch { /* invalid/expired — ignore */ }
  }
  next();
}

/** Hard require — 401 if no valid token. */
function requireAuth (req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Autenticação necessária.' });
  next();
}

function signToken (payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { optionalAuth, requireAuth, signToken };
