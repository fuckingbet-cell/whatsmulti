const express = require('express');

const router = express.Router();

function getDb(req) {
  return req.app.get('db');
}

// List all accounts for current user
router.get('/', async (req, res) => {
  const db = getDb(req);
  const [rows] = await db.query(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

// Create account (called from desktop app after scanning QR)
router.post('/', async (req, res) => {
  const { label, phone, device_id } = req.body;
  const db = getDb(req);
  const [r] = await db.query(
    'INSERT INTO accounts (user_id, label, phone, device_id, status) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, label || 'New Account', phone || null, device_id || null, 'online']
  );
  res.json({ id: r.insertId || r.lastID });
});

// Update account status/notes (called by desktop app to sync state)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes, phone, label } = req.body;
  const fields = [];
  const params = [];
  if (status)   { fields.push('status = ?');   params.push(status); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  if (phone)    { fields.push('phone = ?');    params.push(phone); }
  if (label)    { fields.push('label = ?');    params.push(label); }
  fields.push('last_seen = CURRENT_TIMESTAMP');
  params.push(id, req.user.id);
  const db = getDb(req);
  await db.query(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
  res.json({ ok: true });
});

// Delete account
router.delete('/:id', async (req, res) => {
  const db = getDb(req);
  await db.query('DELETE FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Push activity event (called by desktop app)
router.post('/:id/events', async (req, res) => {
  const { event, payload } = req.body;
  const db = getDb(req);
  await db.query(
    'INSERT INTO activity_log (account_id, event, payload) VALUES (?, ?, ?)',
    [req.params.id, event, JSON.stringify(payload || {})]
  );
  res.json({ ok: true });
});

// Recent events for an account
router.get('/:id/events', async (req, res) => {
  const db = getDb(req);
  const [rows] = await db.query(
    'SELECT id, event, payload, created_at FROM activity_log WHERE account_id = ? ORDER BY created_at DESC LIMIT 100',
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
