// src/main/utils/downloadManager.js
import fs from "fs";
import https from "https";
import extract from "extract-7z";

export function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      const total = parseInt(response.headers["content-length"] || 0, 10);
      let downloaded = 0;

      response.pipe(file);
      response.on("data", (chunk) => {
        downloaded += chunk.length;
        onProgress?.((downloaded / total) * 100);
      });
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

export function extractArchive(archive, dest, onProgress) {
  return extract(archive, dest, {
    onProgress: (progress) => onProgress?.(progress.percent),
  });
}
