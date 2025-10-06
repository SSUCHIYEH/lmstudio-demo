const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fetch = require('node-fetch');

// 軟體配置設定
const SOFTWARE_CONFIG = {
  lmstudio: {
    name: 'LM Studio',
    url: 'https://installers.lmstudio.ai/win32/x64/0.3.28-2/LM-Studio-0.3.28-2-x64.exe',
    tempFileName: 'LMStudio-Setup.exe',
    localAppPath: 'LM Studio',
    programFilesPath: 'LM Studio',
    uninstallerName: 'Uninstall LM Studio.exe'
  },
  anythingllm: {
    name: 'AnythingLLM',
    url: 'https://cdn.anythingllm.com/latest/AnythingLLMDesktop.exe',
    tempFileName: 'AnythingLLM-Setup.exe',
    localAppPath: 'AnythingLLM',
    programFilesPath: 'AnythingLLM',
    uninstallerName: 'Uninstall AnythingLLM.exe'
  }
};

// 預設軟體 (可修改為 'lmstudio' 或 'anythingllm')
const DEFAULT_SOFTWARE = 'anythingllm';

function getSoftwareConfig(softwareType = DEFAULT_SOFTWARE) {
  const config = SOFTWARE_CONFIG[softwareType];
  if (!config) {
    throw new Error(`Unsupported software type: ${softwareType}`);
  }
  
  return {
    ...config,
    tempExePath: path.join(os.tmpdir(), config.tempFileName),
    localAppPath: path.join(process.env.LOCALAPPDATA || 'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local', 'Programs', config.localAppPath),
    programFilesPath: path.join(process.env.ProgramFiles || 'C:\\Program Files', config.programFilesPath)
  };
}

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

async function downloadAndInstall(softwareType = DEFAULT_SOFTWARE) {
  try {
    const config = getSoftwareConfig(softwareType);
    
    console.log(`start download ${config.name}...`);
    console.log(`Temp file exists: ${fs.existsSync(config.tempExePath)}`);
    
    // 下載 EXE 安裝檔
    if (!fs.existsSync(config.tempExePath)) {
      await downloadFile(config.url, config.tempExePath);
      console.log('download complete');
    } else {
      console.log('installer already exists, skipping download');
    }

    console.log(`start install ${config.name}...`);
    
    // 執行 Windows 靜默安裝
    await runCommand(`"${config.tempExePath}" /S /D="${config.localAppPath}"`);

    console.log('install complete');
    
    // 清理臨時檔案
    if (fs.existsSync(config.tempExePath)) {
      fs.unlinkSync(config.tempExePath);
      console.log('clean up temp files complete');
    }
    
    return true;
  } catch (err) {
    console.error('install failed:', err);
    return false;
  }
}

async function remove(softwareType = DEFAULT_SOFTWARE) {
  try {
    const config = getSoftwareConfig(softwareType);
    
    console.log(`start remove ${config.name}...`);
    
    // 檢查程式是否安裝在 LOCALAPPDATA
    if (fs.existsSync(config.localAppPath)) {
      const uninstaller = path.join(config.localAppPath, config.uninstallerName);
      
      if (fs.existsSync(uninstaller)) {
        // 使用官方卸載程式
        await runCommand(`"${uninstaller}" /S`);
        console.log('remove successful');
      } else {
        // 手動刪除資料夾
        await runCommand(`rmdir /s /q "${config.localAppPath}"`);
        console.log('remove folder manually successful');
      }
    } else {
      // 檢查是否安裝在 Program Files
      if (fs.existsSync(config.programFilesPath)) {
        const uninstaller = path.join(config.programFilesPath, config.uninstallerName);
        
        if (fs.existsSync(uninstaller)) {
          await runCommand(`"${uninstaller}" /S`);
          console.log('remove from Program Files complete');
        } else {
          await runCommand(`rmdir /s /q "${config.programFilesPath}"`);
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

async function status(softwareType = DEFAULT_SOFTWARE) {
  const config = getSoftwareConfig(softwareType);
  
  console.log(`Checking ${config.name} installation status...`);
  console.log(`LocalApp path: ${config.localAppPath}`);
  console.log(`Program Files path: ${config.programFilesPath}`);
  
  // 檢查 LOCALAPPDATA 路徑
  if (fs.existsSync(config.localAppPath) && fs.readdirSync(config.localAppPath).length > 0) {
    console.log(`${config.name} found in LocalApp`);
    return true;
  }
  
  // 檢查 Program Files 路徑
  if (fs.existsSync(config.programFilesPath) && fs.readdirSync(config.programFilesPath).length > 0) {
    console.log(`${config.name} found in Program Files`);
    return true;
  }
  
  console.log(`${config.name} not found`);
  return false;
}

module.exports = { downloadAndInstall, remove, status };
