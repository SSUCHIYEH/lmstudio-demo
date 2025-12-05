const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const download = require('./backend/download');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 600,
    frame: false, // 隱藏預設標題列
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    roundedCorners: true, // 啟用圓角
    icon: path.join(__dirname, 'assets', 'icon.ico'),
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

// 下載與安裝管理

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

// 視窗控制
ipcMain.on('window-minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});