// src/main/installer/forgeInstaller.js
import path from "path";
import fs from "fs-extra";
import { exec } from "child_process";
import { downloadFile, extractArchive } from "../utils/downloadManager.js";

const FORGE_URL = "https://github.com/lllyasviel/stable-diffusion-webui-forge/releases/latest/download/webui_forge_cu121_torch231.7z";

export async function installForge(targetDir, onProgress) {
  const archivePath = path.join(targetDir, "forge.7z");

  // 1️⃣ 下載
  onProgress?.("downloading", 0);
  await downloadFile(FORGE_URL, archivePath, (p) => onProgress?.("downloading", p));

  // 2️⃣ 解壓
  onProgress?.("extracting", 0);
  await extractArchive(archivePath, targetDir, (p) => onProgress?.("extracting", p));

  // 3️⃣ 執行 update.bat
  const forgeDir = path.join(targetDir, "stable-diffusion-webui-forge");
  onProgress?.("updating");
  await execPromise(`"${path.join(forgeDir, "update.bat")}"`);

  // 4️⃣ 安裝完成
  onProgress?.("done");
}

export async function uninstallForge(targetDir) {
  if (fs.existsSync(targetDir)) {
    await fs.remove(targetDir);
  }
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, { windowsHide: true });
    child.on("exit", resolve);
    child.on("error", reject);
  });
}
