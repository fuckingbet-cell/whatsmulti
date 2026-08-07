const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  createAccount: (data) => ipcRenderer.invoke('create-account', data),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  refreshQR: (id) => ipcRenderer.invoke('refresh-qr', id),
  updateAccountStatus: (data) => ipcRenderer.invoke('update-account-status', data),
  setActiveTab: (id) => ipcRenderer.send('set-active-tab', id),
  onAccountsUpdated: (callback) => {
    ipcRenderer.on('accounts-updated', (_, accounts) => callback(accounts));
    return () => ipcRenderer.removeAllListeners('accounts-updated');
  },
});