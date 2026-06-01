const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Holt die Version direkt aus dem Electron-Prozess
  appVersion: process.env.npm_package_version || "0.0.21", 
  
  onUpdateMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('update-message', subscription);
    return () => ipcRenderer.removeListener('update-message', subscription);
  }
});