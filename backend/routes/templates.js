const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const [r] = await pool.query(
    'INSERT INTO templates (user_id, title, body) VALUES (?, ?, ?)',
    [req.user.id, title, body]
  );
  res.json({ id: r.insertId });
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
