# Multi-WhatsApp Desktop App — Implementation Plan

## Goal
Build a desktop application (Electron) that hosts multiple WhatsApp Web accounts, each in its own isolated tab. Backend + frontend dashboard hosted on Hostinger shared hosting.

## Architecture

- **Desktop App (Electron + React):** Each tab is a `BrowserView` pointing at `https://web.whatsapp.com`. A background login flow pairs each account and stores session credentials. Tab strip on the side allows switching accounts; each tab is fully isolated (separate webview, separate session).
- **Backend (Node.js + Express):** REST API hosted on Hostinger Node.js app. Stores account metadata (name, phone, profile picture, notes), message templates, scheduled messages, and per-account settings. Uses MySQL (Hostinger provides MySQL).
- **Frontend (React, served as static build):** A web dashboard hosted on Hostinger to manage accounts, view message stats, manage templates, configure auto-replies. Communicates with backend via API.
- **Sync:** Desktop app pings backend every X seconds to sync account status, send scheduled messages, log activity.

## Tech Stack

- Desktop: Electron + React + BrowserView
- Backend: Node.js, Express, MySQL (mysql2), JWT auth
- Frontend: React (Vite), TailwindCSS, Axios
- Hosting: Hostinger (Node.js hosting for backend, File Manager / FTP for frontend static)

## Files

```
multi-whatsapp-app/
├── desktop/                  # Electron app
│   ├── package.json
│   ├── electron/
│   │   ├── main.js          # Electron main process, tab manager
│   │   ├── preload.js
│   │   └── store.js         # local session storage
│   ├── src/
│   │   ├── App.jsx          # tab UI
│   │   ├── index.html
│   │   ├── main.jsx
│   │   └── styles.css
│   └── vite.config.js
├── backend/                  # Hostinger Node.js backend
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── accounts.js
│   │   ├── templates.js
│   │   └── messages.js
│   ├── db/
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   └── .env.example
├── frontend/                 # Hostinger static dashboard
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Accounts.jsx
│       │   ├── Templates.jsx
│       │   └── Messages.jsx
│       ├── api/client.js
│       └── styles.css
└── README.md
```

## Implementation Steps

1. Create directory structure
2. Backend: Node.js + Express + MySQL scaffold
3. Backend: Auth routes (JWT)
4. Backend: Account CRUD routes
5. Backend: Templates + scheduled messages
6. Backend: Database schema
7. Frontend: React dashboard with login
8. Frontend: Account management pages
9. Frontend: Build static files
10. Desktop: Electron main process with BrowserView tabs
11. Desktop: Tab UI with React
12. Desktop: Pair WhatsApp accounts (each tab = isolated webview)
13. Desktop: Sync with backend
14. README with Hostinger deployment instructions
