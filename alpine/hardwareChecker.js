const { ipcRenderer } = require('electron');
const si = require('systeminformation');

const hardwareChecker = (params = {}) => ({
  cpu: '',
  memory: '',
  graphics: '',

  async checkHardware() {
    // const result = await ipcRenderer.invoke('hardware-info');
    // this.cpu = result.cpu;
    // this.memory = result.memory;
    // this.graphics = result.graphics;
    si.cpu().then(data => console.log('CPU:', data));
    si.mem().then(data => console.log('Memory:', data));
    si.graphics().then(data => console.log('Graphics:', data));
    si.getAllData().then(data => {
      console.log('硬體', data)
    });
  },

  ...params
})

document.addEventListener('alpine:init', () => {
  Alpine.data('hardwareChecker', hardwareChecker);
});