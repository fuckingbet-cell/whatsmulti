require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDb = require('./db/pool');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

let db;

async function start() {
  db = await initDb();
  // Make db available to routes
  app.set('db', db);

  // Public health check
  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // Auth (public)
  app.use('/api/auth', require('./routes/auth'));

  // Protected
  const auth = require('./middleware/auth');
  app.use('/api/accounts',  auth, require('./routes/accounts'));
  app.use('/api/templates', auth, require('./routes/templates'));
  app.use('/api/messages',  auth, require('./routes/messages'));

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Multi-WhatsApp backend on :${port}`));
}

start().catch(console.error);
