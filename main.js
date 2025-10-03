const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const lmstudio = require('./lmstudio');

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.handle('download-install', async () => {
  return await lmstudio.downloadAndInstall();
});

ipcMain.handle('remove', async () => {
  return await lmstudio.remove();
});

ipcMain.handle('status', async () => {
  return await lmstudio.status();
});