const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openStreaming:        (url) => ipcRenderer.send('open-streaming', url),
  closeStreaming:       ()    => ipcRenderer.send('close-streaming'),
  loadUrl:             (url) => ipcRenderer.send('load-url', url),
  openStreamingWindow: (url) => ipcRenderer.send('open-streaming-window', url),
  closeStreamingWindow:()    => ipcRenderer.send('close-streaming-window'),
});
