const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openStreaming: (url) => ipcRenderer.send('open-streaming', url),
  closeStreaming: ()  => ipcRenderer.send('close-streaming'),
});
