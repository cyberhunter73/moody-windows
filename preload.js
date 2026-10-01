const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('moody', {
  setClickThrough: (value) => ipcRenderer.send('set-click-through', value),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onClickThroughChanged: (cb) => ipcRenderer.on('click-through-changed', (_e, v) => cb(v)),
  getBounds: () => ipcRenderer.invoke('get-bounds'),
  resizeTo: (startBounds, width, height) => ipcRenderer.send('resize-to', { startBounds, width, height }),
});
