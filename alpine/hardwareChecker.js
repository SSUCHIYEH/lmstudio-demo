const { ipcRenderer } = require('electron');
const si = require('systeminformation');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const hardwareChecker = () => ({
  progress: 0,
  status: 'initial', // initial, fetching, finished
  serialNumber: '',
  os: '',
  cpu: '',
  cpuCores: '',
  memory: '',
  driverVersion: '',
  graphics: [],
  diskC: {
    total: 0,
    used: 0,
    available: 0,
    usedPercent: 0,
    display: ''
  },

  async init() {
    try{
      this.serialNumber = await this.getSerialNumber();
      console.log('Serial Number:', this.serialNumber);
    } catch(e) {
      console.log(e)
    }
  },

  async getSerialNumber() {
    try {
      // 使用 PowerShell 命令
      const { stdout } = await execPromise('powershell "Get-CimInstance -ClassName Win32_BIOS | Select-Object -ExpandProperty SerialNumber"');
      const serialNumber = stdout.trim();
      return serialNumber || '';
    } catch (e) {
      console.log('Failed to get serial number:', e);
      return '';
    }
  },

  async getNvidiaDriver() {
    try {
      const { stdout } = await execPromise('nvidia-smi --query-gpu=driver_version --format=csv,noheader');
      const version = stdout.trim();
      if (version) {
        return version
      }
      return ''
    } catch (e) {
      console.log('nvidia-smi not found, trying alternative method');
      return ''
    }
  },

  async checkHardware() {
    console.log('Starting hardware check...');
    this.resetValue();
    this.status = 'fetching';
    
    // os
    const osData = await si.osInfo();
    console.log('OS Data:', osData);
    this.os = `${osData.platform} ${osData.release.split('.')[0]} ${osData.arch}`;
    this.progress = 10;

    // cpu
    const cpuData = await si.cpu()
    this.cpu = cpuData.brand;
    this.cpuCores = cpuData.cores;
    this.progress = 25;
    
    // gpu
    const gpuData = await si.graphics();
    this.driverVersion = await this.getNvidiaDriver();
    this.graphics = gpuData.controllers.map(gpu => gpu.model);
    this.progress = 50;

    // memory
    const memData = await si.mem();
    this.memory = Math.round(memData.total / 1024 / 1024 / 1024); // GB
    this.progress = 75;

    // disk C:
    const fsData = await si.fsSize();
    const cDrive = fsData.find(disk => disk.mount === 'C:');
    this.progress = 100;

    if (cDrive) {
      const total = Math.round(cDrive.size / 1024 / 1024 / 1024);
      const available = Math.round((cDrive.size - cDrive.used) / 1024 / 1024 / 1024); // GB
      this.diskC = {
        total: total, // GB 
        // used: Math.round(cDrive.used / 1024 / 1024 / 1024), // GB
        available: available, // GB
        // usedPercent: Math.round(cDrive.use)
        display: `C槽：${total}GB 可用(${available}GB)`
      };
    }

    this.status = 'finished';
  },

   downloadReport() {
    if (this.status !== 'finished') {
      alert('請先完成硬體檢測');
      return;
    }

    // 產生報告內容
    const now = new Date();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const reportContent = `
硬體檢測報告
=====================================
檢測時間: ${timestamp}
=====================================

序號 (Serial Number): ${this.serialNumber || '未取得'}

作業系統 (OS): ${this.os}

處理器 (CPU): ${this.cpu}
核心數 (CPU Cores): ${this.cpuCores}

記憶體 (Memory): ${this.memory} GB

顯示卡 (Graphics):
${this.graphics.map((gpu, index) => `  ${index + 1}. ${gpu}`).join('\n')}

驅動版本 (Driver Version): ${this.driverVersion || '未取得'}


硬碟資訊 (Disk):
  ${this.diskC.display}
  總容量: ${this.diskC.total} GB
  可用空間: ${this.diskC.available} GB

=====================================
報告結束
      `;

    // 建立下載
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // 檔案名稱使用時間戳記
    const filename = `report_${timestamp}.txt`;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('報告已下載:', filename);
   },

  resetValue() {
    this.os = '';
    this.cpu = '';
    this.memory = '';
    this.graphics = [];
    this.diskC = {
      total: 0,
      used: 0,
      available: 0,
      usedPercent: 0
    };
  },
})

document.addEventListener('alpine:init', () => {
  Alpine.data('hardwareChecker', hardwareChecker);
});