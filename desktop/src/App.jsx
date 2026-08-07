import { useState, useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [modal, setModal] = useState(null);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const webviewRefs = useRef({});
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, accountId: null });

  // Load accounts from Electron store on mount
  useEffect(() => {
    ipcRenderer.invoke('get-accounts').then(setAccounts);
    // Listen for account updates from main process
    const unsub = ipcRenderer.on('accounts-updated', (_, newAccounts) => setAccounts(newAccounts));
    return () => unsub();
  }, []);

  // When active tab changes, focus that webview
  useEffect(() => {
    if (activeTab && webviewRefs.current[activeTab]) {
      webviewRefs.current[activeTab].focus();
    }
  }, [activeTab]);

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
    <div className="app">
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
              <webview
                ref={(el) => { webviewRefs.current[activeAccount.id] = el; }}
                src="https://web.whatsapp.com"
                partition={`persist:whatsapp-${activeAccount.id}`}
                preload={window.__PRELOAD_PATH__}
                nodeintegration="no"
                contextisolation="yes"
                sandbox="yes"
                allowpopups
                style={{ display: activeAccount.status === 'qr_needed' ? 'none' : 'block' }}
              />
              {activeAccount.status === 'qr_needed' && (
                <div className="qr-overlay">
                  <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
                  <button className="refresh-btn" onClick={() => handleRefreshQR(activeAccount.id)}>Refresh QR</button>
                </div>
              )}
              {activeAccount.status !== 'online' && activeAccount.status !== 'qr_needed' && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p style={{color:'#666'}}>Loading WhatsApp Web...</p>
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