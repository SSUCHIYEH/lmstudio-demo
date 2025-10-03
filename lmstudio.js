const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fetch = require('node-fetch');

const DMG_URL = 'https://installers.lmstudio.ai/darwin/arm64/0.3.27-4/LM-Studio-0.3.27-4-arm64.dmg';
const TEMP_DMG_PATH = path.join(os.tmpdir(), 'LMStudio.dmg');
const APP_PATH = '/Applications/LM Studio.app';

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('下載失敗');
  const fileStream = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(stderr);
      else resolve(stdout);
    });
  });
}

async function downloadAndInstall() {
  try {
    // 下載 DMG
    if (!fs.existsSync(TEMP_DMG_PATH)) {
      await downloadFile(DMG_URL, TEMP_DMG_PATH);
    }
    // 掛載 DMG
    await runCommand(`hdiutil attach ${TEMP_DMG_PATH}`);
    // 安裝到 /Applications
    await runCommand(`cp -R "/Volumes/LM Studio 0.3.27-arm64/LM Studio.app" "${APP_PATH}"`);
    // 卸載 DMG
    await runCommand(`hdiutil detach /Volumes/LM Studio 0.3.27-arm64`);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function remove() {
  try {
    if (fs.existsSync(APP_PATH)) {
      await runCommand(`rm -rf ${APP_PATH}`);
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function status() {
  return fs.existsSync(APP_PATH);
}

module.exports = { downloadAndInstall, remove, status };
