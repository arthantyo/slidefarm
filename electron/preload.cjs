const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('slidefarmWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  close: () => ipcRenderer.invoke('window:close'),
  connectTikTok: () => ipcRenderer.invoke('tiktok:connect'),
  markInteractive: (stage) => ipcRenderer.invoke('startup:interactive', stage),
  onMaximizedChange: (callback) => {
    const listener = (_event, maximized) => callback(maximized);
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  },
});
