const { app, BrowserWindow, ipcMain, BrowserView, screen } = require('electron');
const Store = require('electron-store');
const path = require('path');
const { spawn } = require('child_process');

const store = new Store();

let mainWindow = null;
let views = new Map(); // accountId -> BrowserView

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(900, height),
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#fff',
      symbolColor: '#111',
      height: 36,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  // Pass preload path to renderer for webview use
  const preloadPath = path.join(__dirname, 'preload.js');
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`window.__PRELOAD_PATH__ = ${JSON.stringify(preloadPath)};`);
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    views.forEach(v => mainWindow.removeBrowserView(v));
    views.clear();
    mainWindow = null;
  });
}

// IPC handlers for account management
ipcMain.handle('get-accounts', () => {
  return store.get('accounts', []);
});

ipcMain.handle('create-account', async (_, { label }) => {
  const accounts = store.get('accounts', []);
  const newAccount = {
    id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    label,
    status: 'qr_needed',
    createdAt: Date.now(),
  };
  accounts.push(newAccount);
  store.set('accounts', accounts);
  broadcastAccounts(accounts);
  
  // Create the BrowserView immediately so WhatsApp Web starts loading
  if (mainWindow) {
    createViewForAccount(newAccount);
  }
  
  return newAccount;
});

ipcMain.handle('delete-account', async (_, id) => {
  let accounts = store.get('accounts', []);
  accounts = accounts.filter(a => a.id !== id);
  store.set('accounts', accounts);
  // Remove view if exists
  const view = views.get(id);
  if (view && mainWindow) mainWindow.removeBrowserView(view);
  views.delete(id);
  broadcastAccounts(accounts);
});

ipcMain.handle('refresh-qr', async (_, id) => {
  const view = views.get(id);
  if (view) {
    view.webContents.reload();
  }
});

ipcMain.handle('update-account-status', async (_, { id, status, avatar, phone }) => {
  const accounts = store.get('accounts', []);
  const idx = accounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], status, avatar, phone, lastSeen: Date.now() };
    store.set('accounts', accounts);
    broadcastAccounts(accounts);
  }
});

function broadcastAccounts(accounts) {
  if (mainWindow) mainWindow.webContents.send('accounts-updated', accounts);
}

function createViewForAccount(account) {
  if (!mainWindow || views.has(account.id)) return;
  
  console.log('Creating BrowserView for account:', account.id, account.label);
  
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: `persist:whatsapp-${account.id}`,
      webSecurity: false,
      allowRunningInsecureContent: true,
      webviewTag: true,
      experimentalFeatures: true,
    },
  });
  
  views.set(account.id, view);
  mainWindow.addBrowserView(view);
  
  // Set bounds immediately
  setTimeout(() => updateViewBounds(account.id), 100);
  
  view.webContents.loadURL('https://web.whatsapp.com');
  console.log('Loaded URL for account:', account.id);
  
  // Listen for login state changes
  view.webContents.on('did-finish-load', () => {
    console.log('did-finish-load for account:', account.id);
    checkLoginState(account.id);
  });
  
  // Handle load errors
  view.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.log(`WebView load failed for ${account.id}:`, errorCode, errorDescription);
  });
  
  // Handle crash
  view.webContents.on('crashed', () => {
    console.log('BrowserView crashed for account:', account.id);
  });
  
  // Periodic check
  const interval = setInterval(() => checkLoginState(account.id), 5000);
  view.webContents.on('destroyed', () => clearInterval(interval));
}

function updateViewBounds(accountId) {
  if (!mainWindow) return;
  const view = views.get(accountId);
  if (!view) return;
  
  const { width, height } = mainWindow.getContentBounds();
  // Sidebar is 80px, top bar is 56px
  view.setBounds({ x: 80, y: 56, width: width - 80, height: height - 56 });
  view.setAutoResize({ width: true, height: true });
}

async function checkLoginState(accountId) {
  const view = views.get(accountId);
  if (!view || view.webContents.isDestroyed()) return;
  
  try {
    // Check if we're logged in by looking for the main app element
    const result = await view.webContents.executeJavaScript(`
      (() => {
        // Check for QR code presence
        const qrCanvas = document.querySelector('canvas[aria-label*="QR"], canvas[aria-label*="Scan"]');
        const mainApp = document.querySelector('[data-testid="pane-side"], [data-testid="chat-list"], ._1RAno, ._2S1VP');
        const phoneNumber = document.querySelector('[data-testid="user-info-phone"], ._1WpWd');
        
        if (qrCanvas) return { status: 'qr_needed' };
        if (mainApp) {
          const phone = phoneNumber ? phoneNumber.textContent.trim() : null;
          return { status: 'online', phone };
        }
        return { status: 'loading' };
      })()
    `);
    
    if (result.status === 'online') {
      // Try to get avatar
      const avatar = await view.webContents.executeJavaScript(`
        (() => {
          const img = document.querySelector('[data-testid="user-info-avatar"] img, ._1WpWd img, ._3BzGz img');
          return img ? img.src : null;
        })()
      `).catch(() => null);
      
      ipcMain.emit('account-status', { id: accountId, status: 'online', avatar, phone: result.phone });
    } else if (result.status === 'qr_needed') {
      ipcMain.emit('account-status', { id: accountId, status: 'qr_needed' });
    }
  } catch (e) {
    // Ignore errors during loading
  }
}

// Listen for account status updates from preload
ipcMain.on('account-status', (_, { id, status, avatar, phone }) => {
  const accounts = store.get('accounts', []);
  const idx = accounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], status, avatar, phone, lastSeen: Date.now() };
    store.set('accounts', accounts);
    broadcastAccounts(accounts);
  }
});

// When active tab changes, create/show the view
ipcMain.on('set-active-tab', (_, accountId) => {
  console.log('set-active-tab called:', accountId);
  
  // First, create view if doesn't exist
  const accounts = store.get('accounts', []);
  const account = accounts.find(a => a.id === accountId);
  if (account && !views.has(accountId)) {
    console.log('Creating view for new active tab:', accountId);
    createViewForAccount(account);
  }
  
  // Show/hide views based on active tab
  views.forEach((view, id) => {
    if (id === accountId) {
      // Ensure bounds are correct and view is visible
      console.log('Updating bounds for active view:', id);
      updateViewBounds(id);
      // BrowserView is automatically visible when added to window
    }
    // Other views remain attached but positioned off-screen or just not focused
  });
  
  updateViewBounds(accountId);
});

// Handle window resize
app.on('browser-window-focus', () => {
  if (mainWindow) {
    views.forEach((_, id) => updateViewBounds(id));
  }
});

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
  
  // Restore views for existing accounts
  const accounts = store.get('accounts', []);
  console.log('Stored accounts:', accounts.length);
  accounts.forEach(acc => {
    if (acc.status === 'online') {
      console.log('Restoring view for online account:', acc.id);
      createViewForAccount(acc);
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security: prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (e, url) => {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });
});