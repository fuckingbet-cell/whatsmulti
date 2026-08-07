const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let pool;

async function initDb() {
  if (process.env.DB_TYPE === 'sqlite') {
    // Use SQLite for local testing
    const db = await open({
      filename: path.join(__dirname, 'local.db'),
      driver: sqlite3.Database
    });
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(120) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        label VARCHAR(120) NOT NULL,
        phone VARCHAR(40) DEFAULT NULL,
        device_id VARCHAR(120) DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        notes TEXT,
        last_seen TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title VARCHAR(120) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        recipient VARCHAR(80) NOT NULL,
        message TEXT NOT NULL,
        send_at DATETIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        event VARCHAR(80) NOT NULL,
        payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);
    return {
      query: async (sql, params) => {
        // Check if it's an INSERT
        const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        if (isInsert) {
          const result = await db.run(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
          return [{ insertId: result.lastID, lastID: result.lastID, affectedRows: result.changes }];
        }
        const rows = await db.all(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
        return [rows];
      },
      execute: async (sql, params) => {
        const result = await db.run(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
        return { lastID: result.lastID, changes: result.changes };
      }
    };
  } else {
    // Use MySQL for production
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
      dateStrings: true,
    });
    return pool;
  }
}

module.exports = initDb;
