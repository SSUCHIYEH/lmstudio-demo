const { ipcRenderer } = require('electron');
const si = require('systeminformation');

const hardwareChecker = () => ({
  status: 'initial',
  cpu: '',
  memory: '',
  graphics: [],

  async checkHardware() {
    this.resetValue();
    this.status = 'fetching';
    // const result = await ipcRenderer.invoke('hardware-info');
    // this.cpu = result.cpu;
    // this.memory = result.memory;
    // this.graphics = result.graphics;
    si.cpu().then(data => this.cpu = data.brand);
    si.mem().then(data => console.log('Memory:', data));
    si.graphics().then(data => this.graphics = data.controllers);
    si.getAllData().then(data => {
      console.log('All Data', data)
      this.cpu = data.cpu.brand;
      this.graphics = data.graphics.controllers;
      this.status = 'finished';
    });
  },

  resetValue() {
    this.cpu = '';
    this.memory = '';
    this.graphics = [];
  },
})

document.addEventListener('alpine:init', () => {
  Alpine.data('hardwareChecker', hardwareChecker);
});