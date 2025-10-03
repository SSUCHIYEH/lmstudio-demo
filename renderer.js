const { ipcRenderer } = require('electron');

const statusEl = document.getElementById('status');
const installBtn = document.getElementById('install');
const removeBtn = document.getElementById('remove');

async function refreshStatus() {
  const stat = await ipcRenderer.invoke('status');
  statusEl.innerText = stat ? "已安裝" : "未安裝";
}

installBtn.addEventListener('click', async () => {
  statusEl.innerText = "下載與安裝中...";
  const result = await ipcRenderer.invoke('download-install');
  statusEl.innerText = result ? "已安裝" : "安裝失敗";
});

removeBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('remove');
  statusEl.innerText = result ? "未安裝" : "移除失敗";
});

refreshStatus();