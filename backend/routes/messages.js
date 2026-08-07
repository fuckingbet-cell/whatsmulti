const express = require('express');

const router = express.Router();

function getDb(req) {
  return req.app.get('db');
}

// Desktop app polls this to get scheduled messages that are due
router.get('/due', async (req, res) => {
  const db = getDb(req);
  const [rows] = await db.query(
    `SELECT sm.*, a.device_id
     FROM scheduled_messages sm
     JOIN accounts a ON a.id = sm.account_id
     WHERE sm.user_id = ? AND sm.status = 'pending' AND sm.send_at <= datetime('now')
     ORDER BY sm.send_at ASC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { account_id, recipient, message, send_at } = req.body;
  if (!account_id || !recipient || !message || !send_at) {
    return res.status(400).json({ error: 'account_id, recipient, message, send_at required' });
  }
  const db = getDb(req);
  const [r] = await db.query(
    `INSERT INTO scheduled_messages (user_id, account_id, recipient, message, send_at)
     SELECT ?, id, ?, ?, ? FROM accounts WHERE id = ? AND user_id = ?`,
    [req.user.id, recipient, message, send_at, account_id, req.user.id]
  );
  res.json({ id: r.insertId || r.lastID });
});

router.get('/', async (req, res) => {
  const db = getDb(req);
  const [rows] = await db.query(
    `SELECT sm.*, a.label AS account_label
     FROM scheduled_messages sm
     JOIN accounts a ON a.id = sm.account_id
     WHERE sm.user_id = ? ORDER BY sm.send_at DESC LIMIT 200`,
    [req.user.id]
  );
  res.json(rows);
});

router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const db = getDb(req);
  await db.query(
    'UPDATE scheduled_messages SET status = ? WHERE id = ? AND user_id = ?',
    [status, req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

module.exports = router;
