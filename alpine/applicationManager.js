// not-downloaded / downloading / downloaded / installing / installed / removing
const ApplicationManager = (params = {}) => ({
  status: 'not-downloaded',
  infoModalOpen: false,
  name: '',
  downloadPercent: 0,
  async init() {
    await this.refreshStatus();
  },
  async refreshStatus() {
    const result = await ipcRenderer.invoke('status', this.name);
    this.status = result
  },
  async download(type) {
    this.infoModalOpen = false;
    this.status = 'downloading';
    // 監聽進度事件
    ipcRenderer.on(`${this.name}-download-progress`, (event, data) => {
      this.downloadPercent = data.percent;
      // if (this.downloadPercent === 100) {
      //   this.status = 'downloaded';
      // }
    });

    if (type === 'zip') {
      const result = await ipcRenderer.invoke('zip-download', this.name);
      this.status = result ? 'downloaded' : 'not-downloaded';
      if (result) { await this.install(); }
    }
    else {    
      const result = await ipcRenderer.invoke('exe-download', this.name);
      this.status = result ? 'downloaded' : 'not-downloaded';
      if (result) { await this.install(); }
    }
    this.downloadPercent = 0;
  },
  async install() {
    this.infoModalOpen = false;
    this.status = 'installing';
     // 開始安裝（這會打開安裝程式）
    const installStarted = await ipcRenderer.invoke('install', this.name);
    
    if (installStarted) {
      // 開始輪詢檢查安裝狀態
      this.startInstallCheck();
    } else {
      this.status = 'downloaded';
    }
  },
  startInstallCheck() {
    // 每3秒檢查一次
    this.installCheckInterval = setInterval(async () => {
      const isInstalled = await ipcRenderer.invoke('status', this.name);
      
      if (isInstalled == 'installed') {
        this.status = 'installed';
        硬體設備與資源檢測
        
        下載檢測報告
        this.stopInstallCheck();
      }
    }, 2000);
    
    setTimeout(() => {
      if (this.status === 'installing') {
        this.stopInstallCheck();
        this.refreshStatus();
      }
    }, 600000);
  },
  
  // 停止檢查
  stopInstallCheck() {
    if (this.installCheckInterval) {
      clearInterval(this.installCheckInterval);
      this.installCheckInterval = null;
    }
  },

  async remove() {
    this.infoModalOpen = false;
    this.status = 'removing';
    const result = await ipcRenderer.invoke('remove', this.name);
    this.status = result ? 'not-downloaded' : 'installed';
  },
  async execute() {
    this.infoModalOpen = false;
    await ipcRenderer.invoke('execute', this.name);
  },
  ...params
})

document.addEventListener('alpine:init', () => {
  Alpine.data('ApplicationManager', ApplicationManager);
});