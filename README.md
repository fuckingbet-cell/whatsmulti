# Multi-WhatsApp Desktop App

A desktop application that lets you run multiple WhatsApp Web accounts simultaneously, each in its own isolated tab. Includes a web dashboard for managing accounts, templates, and scheduled messages — hosted on Hostinger.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DESKTOP APP (Electron)                   │
│  ┌──────────┐  ┌────────────────────────────────────────────┐  │
│  │ Sidebar  │  │              BrowserView Tabs              │  │
│  │  📱 Acc1 │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │  │
│  │  📱 Acc2 │  │  │WebView 1│  │WebView 2│  │WebView 3│    │  │
│  │  ➕ Add  │  │  │whatsapp │  │whatsapp │  │whatsapp │    │  │
│  └──────────┘  │  │  .com   │  │  .com   │  │  .com   │    │  │
│                │  └─────────┘  └─────────┘  └─────────┘    │  │
│  Each tab =    │  Separate partition = isolated sessions    │  │
│  separate      │  (cookies, localStorage, cache per account)│  │
│  BrowserView   │                                             │  │
└────────────────┼─────────────────────────────────────────────┘
                 │ HTTPS + REST API
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HOSTINGER BACKEND                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Express    │  │    MySQL     │  │   Scheduled Jobs     │  │
│  │   API        │◄─┤  Database    │  │   (cron: every min)  │  │
│  │  /api/*      │  │  users       │  │  - send due messages │  │
│  │  JWT Auth    │  │  accounts    │  │  - sync status       │  │
│  └──────────────┘  │  templates   │  └──────────────────────┘  │
│                    │  messages    │                              │
│                    │  activity    │                              │
│                    └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                 ▲
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HOSTINGER FRONTEND                           │
│  Static React build (Vite) served from public_html/            │
│  Dashboard: accounts, templates, scheduled messages            │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Multiple WhatsApp accounts** — each in its own tab with isolated session storage
- **Persistent login** — scan QR once, stay logged in across restarts
- **Web dashboard** — manage accounts, create message templates, schedule messages
- **Backend API** — sync status, push scheduled messages to desktop app
- **Hostinger ready** — Node.js backend + static frontend on shared hosting

## Quick Start (Local Development)

### 1. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your local MySQL credentials
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
# Edit src/api/client.js with your backend URL (http://localhost:3000/api for local)
npm run dev
```

### 3. Desktop App
```bash
cd desktop
npm install
npm run electron:dev
```

## Hostinger Deployment

### Prerequisites
- Hostinger **Business** or **Cloud** hosting plan (Node.js support required)
- SSH access enabled (hPanel → Advanced → SSH Access)

### 1. Backend Deployment

**Option A: Hostinger Node.js App (Recommended)**
1. In hPanel → **Setup Node.js App**
   - Node.js version: 20.x
   - Application root: `multi-whatsapp-backend`
   - Application URL: `api.yourdomain.com` (subdomain)
   - Startup file: `server.js`
2. Click **Create**
3. In the app details, click **Run NPM Install**
4. Set environment variables from `.env.example`:
   - `DB_HOST` = `localhost`
   - `DB_USER` = your MySQL username
   - `DB_PASS` = your MySQL password
   - `DB_NAME` = your database name
   - `JWT_SECRET` = (generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `JWT_EXPIRES_IN` = `30d`
   - `CORS_ORIGIN` = `https://yourdomain.com` (your frontend domain)
   - `PORT` = `3000` (or whatever Hostinger assigns)
5. Click **Restart App**

**Option B: Manual via SSH**
```bash
# SSH into your hosting
ssh user@yourdomain.com

# Create directory
mkdir -p ~/multi-whatsapp-backend
cd ~/multi-whatsapp-backend

# Upload files (via SFTP or git clone)
# Then:
npm install --production
# Create .env with your values
# Run database schema in phpMyAdmin
# Start with PM2:
npm install -g pm2
pm2 start server.js --name multiwa-backend
pm2 save
pm2 startup
```

**Database Setup:**
1. hPanel → **Databases** → **MySQL Databases**
2. Create database: `multiwa`
3. Create user and assign to database
4. Open **phpMyAdmin**, select database, import `backend/db/schema.sql`

### 2. Frontend Deployment

1. Build locally:
```bash
cd frontend
# Edit src/api/client.js - set API = 'https://api.yourdomain.com/api'
npm run build
```

2. Upload `dist/` contents to Hostinger:
   - **Option A:** hPanel → **File Manager** → `public_html/` → upload all files from `dist/`
   - **Option B:** SFTP to `public_html/`
   - **Option C:** If using subdomain `app.yourdomain.com`, upload to that subdomain's document root

3. For SPA routing, create `.htaccess` in `public_html/`:
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### 3. Desktop App Distribution

```bash
cd desktop
npm run build
npm run dist
```

This creates installers in `dist/`:
- Windows: `.exe` (NSIS)
- macOS: `.dmg`
- Linux: `.AppImage`

## Project Structure

```
multi-whatsapp-app/
├── backend/                 # Node.js + Express API (Hostinger)
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js         # JWT register/login
│   │   ├── accounts.js     # CRUD + status sync
│   │   ├── templates.js    # Message templates
│   │   └── messages.js     # Scheduled messages
│   ├── middleware/auth.js  # JWT verification
│   ├── db/
│   │   ├── pool.js         # MySQL connection pool
│   │   └── schema.sql      # Database schema
│   └── .env.example
├── frontend/               # React dashboard (Hostinger static)
│   ├── src/
│   │   ├── App.jsx         # All pages (login, accounts, templates, messages)
│   │   ├── api/client.js   # API client
│   │   └── styles.css      # Tailwind + custom
│   └── vite.config.js
├── desktop/                # Electron app
│   ├── electron/
│   │   ├── main.js         # Main process, BrowserView management
│   │   └── preload.js      # Secure IPC bridge
│   ├── src/
│   │   ├── App.jsx         # Tab UI, webview integration
│   │   └── styles.css
│   └── package.json
└── README.md
```

## How It Works

### Desktop App (Electron)
- Each account = one `BrowserView` with unique `partition: "persist:whatsapp-{id}"`
- Partitions isolate cookies, localStorage, IndexedDB, cache per account
- Sidebar shows account avatars; click to switch tabs
- Right-click tab → Refresh QR / Delete Account
- Main process monitors login state via `executeJavaScript` in each webview
- Status synced to backend via REST API

### Backend API
- `POST /api/auth/register` — create user
- `POST /api/auth/login` — get JWT
- `GET /api/accounts` — list accounts
- `POST /api/accounts` — register new account (from desktop)
- `PATCH /api/accounts/:id` — update status, notes, phone
- `POST /api/accounts/:id/events` — log activity
- `GET /api/templates` / `POST` / `DELETE` — message templates
- `GET /api/messages/due` — desktop polls for messages to send
- `POST /api/messages` — schedule message from dashboard

### Frontend Dashboard
- Login / Register
- Accounts: view status, refresh QR, delete
- Templates: create reusable message snippets
- Scheduled Messages: queue messages for specific accounts/times

## Security Notes

- Each `BrowserView` uses `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Preload script exposes only safe IPC methods via `contextBridge`
- JWT tokens stored in localStorage (dashboard) / electron-store (desktop)
- CORS restricted to your frontend domain
- Passwords bcrypt-hashed (cost 10)
- SQL uses parameterized queries

## Troubleshooting

**WhatsApp Web doesn't load in webview:**
- Ensure `webSecurity: true` and proper `partition`
- Some corporate networks block WhatsApp Web — try VPN

**QR code not appearing:**
- Click "Refresh QR" in context menu
- WhatsApp sometimes rate-limits QR generation

**Desktop app won't start on Linux:**
- Install dependencies: `sudo apt install libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2`
- Or use AppImage which bundles dependencies

**Hostinger Node.js app shows 503:**
- Check PM2 logs: `pm2 logs multiwa-backend`
- Verify `.env` values match hPanel database credentials
- Ensure `PORT` matches what Hostinger assigns

## License

MIT — free for personal and commercial use.

---

**Built with:** Electron, React, Vite, Express, MySQL, TailwindCSS