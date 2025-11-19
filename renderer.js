const { ipcRenderer } = require('electron');

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
    this.status = 'removing';
    const result = await ipcRenderer.invoke('remove', this.name);
    this.status = result ? 'uninstalled' : 'installed';
  },
  ...params
})

document.addEventListener('alpine:init', () => {
  Alpine.data('ApplicationManager', ApplicationManager);
});