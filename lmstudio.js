const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fetch = require('node-fetch');

// Windows 專用設定
const EXE_URL = 'https://installers.lmstudio.ai/win32/x64/0.3.28-2/LM-Studio-0.3.28-2-x64.exe';
const TEMP_EXE_PATH = path.join(os.tmpdir(), 'LMStudio-Setup.exe');
// TODO: 待改成下載至軟體路徑
const WINDOWS_APP_PATH = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local', 'Programs', 'LM Studio');

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  
  // 確保目標目錄存在
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(dest);
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    // Windows 專用命令執行
    exec(cmd, { 
      encoding: 'utf8',
      shell: 'cmd.exe'
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`command exec failed: ${stderr || error.message}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function downloadAndInstall() {
  try {
    console.log('start download LM Studio...');
    
    // 下載 EXE 安裝檔
    if (!fs.existsSync(TEMP_EXE_PATH)) {
      await downloadFile(EXE_URL, TEMP_EXE_PATH);
      console.log('download complete');
    } else {
      console.log('installer already exists, skipping download');
    }

    console.log('start install LM Studio...');
    
    // 執行 Windows 靜默安裝
    await runCommand(`"${TEMP_EXE_PATH}" /S /D="${WINDOWS_APP_PATH}"`);

    console.log('install complete');
    
    // 清理臨時檔案
    if (fs.existsSync(TEMP_EXE_PATH)) {
      fs.unlinkSync(TEMP_EXE_PATH);
      console.log('clean up temp files complete');
    }
    
    return true;
  } catch (err) {
    console.error('install failed:', err);
    return false;
  }
}

async function remove() {
  try {
    console.log('start remove LM Studio...');
    
    // 檢查程式是否安裝在 LOCALAPPDATA
    if (fs.existsSync(WINDOWS_APP_PATH)) {
      const uninstaller = path.join(WINDOWS_APP_PATH, 'Uninstall LM Studio.exe');
      
      if (fs.existsSync(uninstaller)) {
        // 使用官方卸載程式
        await runCommand(`"${uninstaller}" /S`);
        console.log('remove successful');
      } else {
        // 手動刪除資料夾
        await runCommand(`rmdir /s /q "${WINDOWS_APP_PATH}"`);
        console.log('remove folder manually successful');
      }
    } else {
      // 檢查是否安裝在 Program Files
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const programFilesPath = path.join(programFiles, 'LM Studio');
      
      if (fs.existsSync(programFilesPath)) {
        const uninstaller = path.join(programFilesPath, 'Uninstall LM Studio.exe');
        
        if (fs.existsSync(uninstaller)) {
          await runCommand(`"${uninstaller}" /S`);
          console.log('remove from Program Files complete');
        } else {
          await runCommand(`rmdir /s /q "${programFilesPath}"`);
          console.log('remove Program Files folder manually complete');
        }
      } else {
        console.log('no installation found');
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error('移除失敗:', err);
    return false;
  }
}

async function status() {
  // 檢查 LOCALAPPDATA 路徑
  if (fs.existsSync(WINDOWS_APP_PATH)) {
    return true;
  }
  
  // 檢查 Program Files 路徑
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesPath = path.join(programFiles, 'LM Studio');
  if (fs.existsSync(programFilesPath)) {
    return true;
  }
  
  return false;
}

module.exports = { downloadAndInstall, remove, status };
