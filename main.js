const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const download = require('./backend/download');

function createWindow() {
  const win = new BrowserWindow({
    width: 1152,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.handle('download-install', async (_event, name) => {
  const win = BrowserWindow.getFocusedWindow();
  return await download.exeDownloadAndInstall(name, (downloaded, total) => {
    win.webContents.send(`${name}-download-progress`, {
      downloaded,
      total,
      percent: total ? Math.round((downloaded / total) * 100) : 0
    });
  });
});

ipcMain.handle('zip-download-install', async (_event, name) => {
  const win = BrowserWindow.getFocusedWindow();
  return await download.zipDownloadAndInstall(name, (downloaded, total) => {
    win.webContents.send(`${name}-download-progress`, {
      downloaded,
      total,
      percent: total ? Math.round((downloaded / total) * 100) : 0
    });
  });
});

ipcMain.handle('remove', async (_event, name) => {
  return await download.remove(name);
});

ipcMain.handle('status', async (_event, name) => {
  return await download.status(name);
});