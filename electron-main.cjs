const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const APP_VERSION = app.getVersion(); // Holt die Version direkt aus der package.json

// ── GHOST NODE AUTO-UPDATER CONFIG ──
autoUpdater.autoDownload = true; 
autoUpdater.autoInstallOnAppQuit = true; // Installiert das Update ERST, wenn der User das Spiel schließt!

let mainWindow; // Globale Referenz für den Updater
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true, // Startet das Spiel direkt im Vollbildmodus
    icon: path.join(__dirname, 'public/favicon.ico'),
    title: "Architects of Chaos",
    backgroundColor: '#05020e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  mainWindow = win; // Referenz für den Updater speichern

  // Lädt die gebaute index.html
  win.loadFile(path.join(__dirname, 'dist/index.html'));
  
  // Entfernt die standardmäßige Browser-Menüleiste (Datei, Bearbeiten, etc.)
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  
  // ── GHOST NODE AUTO-UPDATER ──
  // Checkt im Hintergrund still und heimlich genau 1x beim Start nach Updates
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (error) {
    console.log("Update-Check fehlgeschlagen (Offline?)", error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', '🔍 SCANNING FOR GHOST_NET UPDATES...');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-message', `📡 NEW ENCRYPTED PATCH FOUND: v${info.version}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) mainWindow.webContents.send('update-message', `📥 DOWNLOADING BYTES: ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-message', '✅ PATCH DOWNLOADED. UPDATE WIRD BEIM BEENDEN INSTALLIERT.');
  
  // KEIN quitAndInstall() hier! 
  // Da oben autoInstallOnAppQuit = true gesetzt ist, macht Electron das ganz automatisch,
  // sobald der Spieler das Fenster schließt (über ALT+F4, den Exit-Button oder das X).
});