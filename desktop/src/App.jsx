import { useState, useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [modal, setModal] = useState(null);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const [windowBounds, setWindowBounds] = useState({ width: 1200, height: 800 });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, accountId: null });

  // Load accounts from Electron store on mount
  useEffect(() => {
    ipcRenderer.invoke('get-accounts').then(setAccounts);
    // Listen for account updates from main process
    const unsub = ipcRenderer.on('accounts-updated', (_, newAccounts) => setAccounts(newAccounts));
    return () => unsub();
  }, []);

  // Notify main process when active tab changes
  useEffect(() => {
    if (activeTab) {
      ipcRenderer.send('set-active-tab', activeTab);
    }
  }, [activeTab]);

  // Handle window resize to update webview bounds
  useEffect(() => {
    const handleResize = () => {
      setWindowBounds({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddAccount = () => {
    setNewAccountLabel('');
    setModal({ type: 'add' });
  };

  const handleModalSubmit = async () => {
    if (!newAccountLabel.trim()) return;
    await ipcRenderer.invoke('create-account', { label: newAccountLabel });
    setModal(null);
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('Delete this WhatsApp account?')) return;
    await ipcRenderer.invoke('delete-account', id);
    setContextMenu({ visible: false, x: 0, y: 0, accountId: null });
  };

  const handleRefreshQR = async (id) => {
    await ipcRenderer.invoke('refresh-qr', id);
    setContextMenu({ visible: false, x: 0, y: 0, accountId: null });
  };

  const handleContextMenu = (e, accountId) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, accountId });
  };

  useEffect(() => {
    const hide = () => setContextMenu({ visible: false, x: 0, y: 0, accountId: null });
    document.addEventListener('click', hide);
    return () => document.removeEventListener('click', hide);
  }, []);

  const activeAccount = accounts.find(a => a.id === activeTab);

  return (
    <div className="app" style={{ width: windowBounds.width, height: windowBounds.height }}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">WA</div>
        </div>
        <div className="tab-list">
          {accounts.map(acc => (
            <button
              key={acc.id}
              className={`tab-btn ${activeTab === acc.id ? 'active' : ''}`}
              onClick={() => setActiveTab(acc.id)}
              onContextMenu={(e) => handleContextMenu(e, acc.id)}
            >
              <img
                className="tab-icon"
                src={acc.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.label)}&background=00a884&color=fff`}
                alt={acc.label}
              />
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="add-btn" onClick={handleAddAccount}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h1>{activeAccount?.label || 'Select an account'}</h1>
          {activeAccount && (
            <div className="account-info">
              <img className="account-avatar" src={activeAccount.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeAccount.label)}&background=00a884&color=fff`} alt="" />
              <div>
                <div className="account-name">{activeAccount.label}</div>
                <div className="account-status">
                  {activeAccount.status === 'online' && '🟢 Online'}
                  {activeAccount.status === 'qr_needed' && '🟡 Scan QR Code'}
                  {activeAccount.status === 'offline' && '⚫ Offline'}
                  {activeAccount.status === 'banned' && '🔴 Banned'}
                </div>
              </div>
            </div>
          )}
        </header>

        <div className="webview-container">
          {activeAccount ? (
            <>
              {activeAccount.status === 'qr_needed' && (
                <div className="qr-overlay">
                  <div className="qr-animation">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="1.5" style={{animation: 'pulse 2s ease-in-out infinite'}}>
                      <rect x="1" y="1" width="22" height="22" rx="3"></rect>
                      <path d="M7 7h10M7 12h10M7 17h6"></path>
                    </svg>
                  </div>
                  <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
                  <p className="qr-hint">The QR code will appear automatically in the WhatsApp Web area</p>
                  <button className="refresh-btn" onClick={() => handleRefreshQR(activeAccount.id)}>Refresh QR</button>
                </div>
              )}
              {activeAccount.status !== 'online' && activeAccount.status !== 'qr_needed' && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p style={{color:'#666'}}>Loading WhatsApp Web...</p>
                </div>
              )}
              {/* When online or qr_needed, the BrowserView from main process renders here */}
              {activeAccount.status === 'online' && (
                <div className="browser-view-placeholder" style={{pointerEvents: 'none'}}>
                  <small style={{color:'#999'}}>WhatsApp Web is loaded in the native view above</small>
                </div>
              )}
            </>
          ) : (
            <div className="loading-overlay">
              <p style={{color:'#666',fontSize:'18px'}}>Select or add a WhatsApp account from the sidebar</p>
            </div>
          )}
        </div>
      </main>

      {contextMenu.visible && (
        <div
          className="custom-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => handleRefreshQR(contextMenu.accountId)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh QR
          </div>
          <div className="context-menu-divider"></div>
          <div className="context-menu-item danger" onClick={() => handleDeleteAccount(contextMenu.accountId)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete Account
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.type === 'add' ? 'Add WhatsApp Account' : 'Edit Account'}</h2>
            <input
              type="text"
              placeholder="Account name (e.g. Personal, Business)"
              value={newAccountLabel}
              onChange={e => setNewAccountLabel(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleModalSubmit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;