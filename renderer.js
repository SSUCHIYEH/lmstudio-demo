const { ipcRenderer } = require('electron');
// const { remove } = require('./lmstudio');

// const statusEl = document.getElementById('status');
// const installBtn = document.getElementById('install');
// const removeBtn = document.getElementById('remove');

// async function refreshStatus() {
//   const stat = await ipcRenderer.invoke('status');
//   statusEl.innerText = stat ? "已安裝" : "未安裝";
// }

// installBtn.addEventListener('click', async () => {
//   statusEl.innerText = "下載與安裝中...";
//   const result = await ipcRenderer.invoke('download-install');
//   statusEl.innerText = result ? "已安裝" : "安裝失敗";
// });

// removeBtn.addEventListener('click', async () => {
//   const result = await ipcRenderer.invoke('remove');
//   statusEl.innerText = result ? "未安裝" : "移除失敗";
// });

// refreshStatus();


const ApplicationManager = (params = {}) => ({
  status: 'uninstalled',
  name: '',
  downloadPercent: 0,


  async refreshStatus() {
    const result = await ipcRenderer.invoke('status', this.name);
    this.status = result ? 'installed' : 'uninstalled';
  },
  async download() {
    this.status = 'downloading';
    // 監聽進度事件
    ipcRenderer.on(`${this.name}-download-progress`, (event, data) => {
      this.downloadPercent = data.percent;
      if (this.downloadPercent === 100) {
        this.status = 'installing';
      }
    });
    const result = await ipcRenderer.invoke('download-install', this.name);
    this.downloadPercent = 0;
    this.status = result ? 'installed' : 'uninstalled';
  },
  async remove() {
    this.status = 'removeing';
    const result = await ipcRenderer.invoke('remove', this.name);
    this.status = result ? 'uninstalled' : 'installed';
  },
  ...params
})

document.addEventListener('alpine:init', () => {
  Alpine.data('ApplicationManager', ApplicationManager);
});