const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const Seven = require('node-7z');
const sevenBin = require('7zip-bin');

// 軟體配置設定
const SOFTWARE_CONFIG = {
  lmstudio: {
    name: 'LM Studio',
    url: 'https://installers.lmstudio.ai/win32/x64/0.3.28-2/LM-Studio-0.3.28-2-x64.exe',
    tempFileName: 'LMStudio-Setup.exe',
    localAppPath: 'LM Studio',
    programFilesPath: 'LM Studio',
    uninstallerName: 'Uninstall LM Studio.exe',
    launcherName: 'LM Studio.exe'
  },
  anythingllm: {
    name: 'AnythingLLM',
    url: 'https://cdn.anythingllm.com/latest/AnythingLLMDesktop.exe',
    tempFileName: 'AnythingLLM-Setup.exe',
    localAppPath: 'AnythingLLM',
    programFilesPath: 'AnythingLLM',
    uninstallerName: 'Uninstall AnythingLLM.exe'
  },
  ollama: {
    name: 'Ollama',
    url: 'https://ollama.com/download/OllamaSetup.exe',
    tempFileName: 'Ollama-Setup.exe',
    localAppPath: 'Ollama',
    programFilesPath: 'Ollama',
    uninstallerName: 'Uninstall Ollama.exe'
  },
  buzz: {
    name: 'Buzz',
    url: 'https://sourceforge.net/projects/buzz-captions/files/Buzz-1.3.3-Windows-X64.zip/download',
    tempZipName: 'Buzz-Setup.zip',
    tempFileName: 'Buzz-1.3.3-windows.exe',
    localAppPath: 'Buzz',
    programFilesPath: 'Buzz',
    uninstallerName: 'unins000.exe',
    launcherName: 'Buzz.exe',
    folder: 'Buzz'
  },
  pdfgear: {
    name: 'PDFgear',
    url: 'https://downloadfiles.pdfgear.com/releases/windows/pdfgear_setup_v2.1.14.exe',
    tempFileName: 'pdfgear_setup_v2.1.14.exe',
    localAppPath: 'PDFgear',
    programFilesPath: 'PDFgear',
    uninstallerName: 'unins000.exe',
    launcherName: 'PDFLauncher.exe',
    spawn: true,
  },
  forgeWebUI: {
    name: 'forgeWebUI',
    url: 'https://github.com/lllyasviel/stable-diffusion-webui-forge/releases/download/latest/webui_forge_cu121_torch231.7z',
    tempZipName: 'webui_forge_cu121_torch231.7z',
    localAppPath: 'forgeWebUI',
    programFilesPath: 'forgeWebUI',
    launcherName: 'run.bat',
    folder: 'forgeWebUI',
    spawn: true,
    noInstall: true
  }
};

// 預設軟體 (可修改為 'lmstudio' 或 'anythingllm')
const DEFAULT_SOFTWARE = 'anythingllm';

function getSoftwareConfig(softwareType = DEFAULT_SOFTWARE) {
  const config = SOFTWARE_CONFIG[softwareType];
  if (!config) {
    throw new Error(`Unsupported software type: ${softwareType}`);
  }

  const result = {
    ...config,
    localAppPath: path.join(process.env.LOCALAPPDATA || 'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local', 'Programs', config.localAppPath),
    programFilesPath: path.join(process.env.ProgramFiles || 'C:\\Program Files', config.programFilesPath)
  }

  if (config.tempZipName) {
    result.tempZipPath = path.join(os.tmpdir(), config.folder, config.tempZipName);
    if(config.tempFileName) {
      result.tempExePath = path.join(os.tmpdir(), config.folder, config.tempFileName);
    }
  } else if(config.tempFileName) {
    result.tempExePath = path.join(os.tmpdir(), config.tempFileName)
  }

  return result;
}

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

// 下載安裝檔並安裝軟體
async function downloadExe(softwareType = DEFAULT_SOFTWARE, onProgress) {
  try {
    const config = getSoftwareConfig(softwareType);
    
    console.log(`start download ${config.name}...`);
    
    // 下載 EXE 安裝檔
    if (!fs.existsSync(config.tempExePath)) {
      await downloadFile(config.url, config.tempExePath , onProgress);
      console.log('download complete');
    } else {
      console.log('installer already exists, skipping download');
    }
    
    return true;
  } catch (err) {
    console.error('install failed:', err);
    return false;
  }
}

async function downloadZipAndUnzip(config, onProgress) {
  try {
    console.log(`start download ${config.name}...`);
    if (!fs.existsSync(config.tempZipPath)) {
      await downloadFile(config.url, config.tempZipPath, onProgress);
      console.log('download complete');
      await upZip(config)

      return true
    } else {
      console.log('zip file already exists, skipping download');
      console.log(config.tempExePath)
      if (!fs.existsSync(config.tempExePath)){
        await upZip(config)
      } else {
        console.log('alreadyd unzip');
      }
      return true
    }
  } catch (err) {
    console.error('download and unzip failed:', err);
    return false
  }
}

async function upZip(config) {
  try {
    console.log(`start unzip ${config.name}...`);
    // 解壓縮 zip 檔到 tmp/buzz
    if (config.tempZipPath.endsWith('.7z')) {
      if (!fs.existsSync(config.localAppPath)) {
        fs.mkdirSync(config.localAppPath, { recursive: true });
      }

      const myStream = Seven.extractFull(config.tempZipPath, config.localAppPath, {
        $bin: sevenBin.path7za,
        recursive: true
      });

      return new Promise((resolve, reject) => {
        myStream.on('end', () => {
          console.log('unzip complete');
          resolve();
        });
        myStream.on('error', (err) => {
          console.error('7z extraction error:', err);
          reject(err);
        });
      });
    } else {
      await fs.createReadStream(config.tempZipPath)
              .pipe(unzipper.Extract({ path: path.join(os.tmpdir(), config.folder) }))
              .promise();
    }
    console.log('unzip complete');
  } catch (err) {
    console.error('unzip failed:', err);
  }
}

async function downloadZip(softwareType = DEFAULT_SOFTWARE, onProgress) {
  try {
    const config = getSoftwareConfig(softwareType);
    
    // 下載ZIP並解壓縮
    const resp = await downloadZipAndUnzip(config, onProgress);
    console.log(`start install ${config.name}...`);
    
    return resp;
  } catch (err) {
    console.error('install failed:', err);
    return false;
  }
}

async function install(softwareType = DEFAULT_SOFTWARE) {
  try {
    const config = getSoftwareConfig(softwareType);
    if (config.noInstall) {
      return true
    }
    // 執行 Windows 靜默安裝
    await runCommand(`"${config.tempExePath}" /S /D="${config.localAppPath}"`);
    console.log('install complete');
    
    // 清理臨時檔案
    if (fs.existsSync(config.tempZipPath)) {
      fs.unlinkSync(config.tempZipPath);
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

async function execute(softwareType = DEFAULT_SOFTWARE) {
  const config = getSoftwareConfig(softwareType);
  
  if (fs.existsSync(config.localAppPath)) {
    const exe = path.join(config.localAppPath, `${config.launcherName}`);
    console.log(`execute ${exe}...`);
    if (fs.existsSync(exe)) {
      console.log(`found launcher at ${exe}`);
      if (config.spawn == true) {
        return await spawnExecute(config);
      }
      else {
        await runCommand(`"${exe}" /S`);
      }
    }
  }
}

async function spawnExecute(config) {
  try {
    console.log(`Attempting to spawn execute ${config.name}...`);
    const exePath = path.join(config.localAppPath, `${config.launcherName}`);
    
    if (config.launcherName.endsWith('.bat')) {
      child = spawn('cmd.exe', ['/c', exePath], {
        detached: true,
        stdio: 'ignore',
        shell: false,
        windowsHide: false,
        cwd: config.localAppPath // 設定工作目錄
      });
    } else {
      child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        shell: false,
        windowsHide: false
      });
    }
    child.unref();

    console.log(`${config.name} launched successfully`);
    return true;
  } catch (err) {
    console.error(`Failed to execute ${softwareType}:`, err);
    return false;
  }
}

async function remove(softwareType = DEFAULT_SOFTWARE) {
  try {
    const config = getSoftwareConfig(softwareType);
    
    console.log(`start remove ${config.name}...`);

    // 清理臨時檔案
    if (fs.existsSync(config.tempZipPath)) {
      fs.unlinkSync(config.tempZipPath);
      console.log('clean up temp files complete');
     }

    if (fs.existsSync(config.tempExePath)) {
      fs.unlinkSync(config.tempExePath);
      console.log('clean up temp files complete');
    }
    
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
  
  // 檢查 LOCALAPPDATA 路徑
  if (fs.existsSync(config.localAppPath) && fs.readdirSync(config.localAppPath).length > 0) {
    console.log(`${config.name} found in LocalApp`);
    return 'installed';
  }
  
  // 檢查 Program Files 路徑
  if (fs.existsSync(config.programFilesPath) && fs.readdirSync(config.programFilesPath).length > 0) {
    console.log(`${config.name} found in Program Files`);
    return 'installed';
  }

  if (config.name != 'forgeWebUI' && (fs.existsSync(config.tempExePath) || fs.existsSync(config.tempZipPath))) {
    console.log(`${config.name} download found`);
    return 'downloaded';
  }
  
  console.log(`${config.name} not found`);
  return 'not-downloaded';
}

module.exports = { downloadExe, remove, status, downloadZip, install, execute };
