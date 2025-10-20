const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const lmstudio = require('./lmstudio');

const fs = require('fs');
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const Seven = require('node-7z');

const streamPipeline = promisify(pipeline);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
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

// app.on('window-all-closed', () => {
//   app.quit();
// });

ipcMain.handle('download-install', async (_event, name) => {
  const win = BrowserWindow.getFocusedWindow();
  return await lmstudio.downloadAndInstall(name, (downloaded, total) => {
    win.webContents.send(`${name}-download-progress`, {
      downloaded,
      total,
      percent: total ? Math.round((downloaded / total) * 100) : 0
    });
  });
});

ipcMain.handle('remove', async (_event, name) => {
  return await lmstudio.remove(name);
});

ipcMain.handle('status', async (_event, name) => {
  return await lmstudio.status(name);
});

ipcMain.handle('start-install', async (event) => {
  event.sender.send('log', 'start download Forge WebUI...');
  try {
      // 下載檔案
      const res = await fetch(downloadUrl);
      const fileStream = fs.createWriteStream(tempFilePath);
      const total = res.headers.get('content-length');
      let downloaded = 0;

      res.body.on('data', chunk => {
          downloaded += chunk.length;
          event.sender.send('progress', { downloaded, total });
      });

      await new Promise((resolve, reject) => {
          res.body.pipe(fileStream);
          res.body.on('error', reject);
          fileStream.on('finish', resolve);
      });

      event.sender.send('log', 'finish download, start extracting...');

      // 解壓
      await new Promise((resolve, reject) => {
          const extractor = Seven.extractFull(tempFilePath, installDir, {
              $bin: 'C:\\Program Files\\7-Zip\\7z.exe',
              $progress: true
          });

          extractor.on('progress', progress => {
              event.sender.send('log', `extracting progress: ${progress.percent.toFixed(2)}%`);
          });

          extractor.on('end', resolve);
          extractor.on('error', reject);
      });

      event.sender.send('log', 'extracting complete，start exec update.bat');

      // 執行 update.bat
      const batPath = path.join(installDir, 'update.bat');
      if (!fs.existsSync(batPath)) {
          event.sender.send('log', 'could not find update.bat，install fail！');
          return;
      }

      const batProcess = spawn('cmd.exe', ['/c', batPath], { cwd: installDir });
      batProcess.stdout.on('data', data => event.sender.send('log', data.toString()));
      batProcess.stderr.on('data', data => event.sender.send('log', data.toString()));

      batProcess.on('exit', code => {
          event.sender.send('log', `update.bat exec end，Exit code: ${code}`);
          event.sender.send('install-complete');
      });

  } catch (err) {
      event.sender.send('log', 'fail: ' + err.message);
  }
});