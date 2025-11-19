const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const unzipper = require('unzipper');

// 軟體配置設定
const config = {
  name: 'Buzz Whisper',
  url: 'https://sourceforge.net/projects/buzz-captions/files/Buzz-1.3.3-Windows-X64.zip/download',
  tempZipName: 'Buzz-Setup.zip',
  tempFileName: 'Buzz-Setup.exe',
  localAppPath: path.join(process.env.LOCALAPPDATA || 'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local', 'Programs', 'Buzz'),
  programFilesPath: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Buzz'),
  uninstallerName: 'Uninstall Buzz Whisper.exe',
  get tempZipPath() { return path.join(os.tmpdir(), this.tempZipName); },
  get tempExePath() { return path.join(os.tmpdir(), this.tempFileName); }
};

async function downloadFile(url, dest, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  
  const total = Number(res.headers.get('content-length')) || 0;
  let downloaded = 0;

  // 確保目標目錄存在
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(dest);
    res.body.on('data', chunk => {
      downloaded += chunk.length;
      if (onProgress && total) {
        onProgress(downloaded, total);
      }
    });
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

async function downloadZipAndUnzip(onProgress) {
  try {
    console.log(`start download buzz whisper...`);
    const tempZipPath = path.join(os.tmpdir(), 'buzz', config.tempZipName);
    if (!fs.existsSync(tempZipPath)) {
      await downloadFile(config.url, tempZipPath, onProgress);
      console.log('download complete');
      // 解壓縮 zip 檔到 tmp/buzz
      await fs.createReadStream(tempZipPath)
              .pipe(unzipper.Extract({ path: path.join(os.tmpdir(), 'buzz') }))
              .promise();
      console.log('unzip complete');
    } else {
      console.log('zip file already exists, skipping download');
    }
  } catch (err) {
    console.error('download and unzip failed:', err);
  }
}

async function downloadAndInstall(onProgress) {
  try {
    // 下載ZIP並解壓縮
    await downloadZipAndUnzip(onProgress);
    console.log(`start install ${config.name}...`);
    // 執行 Windows 靜默安裝
    await runCommand(`"${config.tempExePath}" /S /D="${config.localAppPath}"`);
    console.log('install complete');
    
    // 清理臨時檔案
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(config.tempExePath);
      console.log('clean up temp files complete');
     }

   
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
    console.error('remove fail:', err);
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
