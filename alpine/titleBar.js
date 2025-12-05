document.addEventListener('alpine:init', () => {
  Alpine.data('TitleBar', () => ({
    minimizeWindow() {
      if (ipcRenderer) {
        ipcRenderer.send('window-minimize');
      }
    },

    maximizeWindow() {
      if (ipcRenderer) {
        ipcRenderer.send('window-maximize');
      }
    },

    closeWindow() {
      if (ipcRenderer) {
        ipcRenderer.send('window-close');
      }
    }
  }));
});