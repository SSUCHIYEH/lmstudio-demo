const { ipcRenderer } = require('electron');
const si = require('systeminformation');

const hardwareChecker = () => ({
  progress: 0,
  status: 'initial', // initial, fetching, finished
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
    this.driverVersion = gpuData.controllers.length == 2 ? gpuData.controllers[1].driverVersion : 'Unknown';
    console.log('GPU Data:', this.driverVersion);
    this.graphics = gpuData.controllers.map(gpu => `${gpu.model} (${gpu.vram / 1024} MB)`);
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

    // si.getAllData().then(data => {
      // this.os = `${data.os.distro} ${data.os.arch} ${data.os.release}`;
      
      // // CPU
      // this.cpu = data.cpu.brand;
      // this.cpuCores = data.cpu.cores;
      
      // // RAM (記憶體) - 從 data.mem 取得
      // this.memory = Math.round(data.mem.total / 1024 / 1024 / 1024); // 轉換成 GB
      // console.log('RAM:', this.memory + ' GB');
      
      // // 顯示卡
      // this.graphics = data.graphics.controllers;
      
      // // C 槽資訊
      // const cDrive = data.fsSize.find(disk => disk.mount === 'C:');
      // if (cDrive) {
      //   this.diskC = {
      //     total: Math.round(cDrive.size / 1024 / 1024 / 1024), // GB
      //     used: Math.round(cDrive.used / 1024 / 1024 / 1024), // GB
      //     available: Math.round((cDrive.size - cDrive.used) / 1024 / 1024 / 1024), // GB
      //     usedPercent: Math.round(cDrive.use)
      //   };
      // }
      
    //});

    this.status = 'finished';
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