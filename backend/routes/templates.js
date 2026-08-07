const express = require('express');

const router = express.Router();

function getDb(req) {
  return req.app.get('db');
}

router.get('/', async (req, res) => {
  const db = getDb(req);
  const [rows] = await db.query(
    'SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const db = getDb(req);
  const [r] = await db.query(
    'INSERT INTO templates (user_id, title, body) VALUES (?, ?, ?)',
    [req.user.id, title, body]
  );
  res.json({ id: r.insertId || r.lastID });
});

router.delete('/:id', async (req, res) => {
  const db = getDb(req);
  await db.query('DELETE FROM templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
