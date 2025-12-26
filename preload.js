const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  statFile: (filePath) => ipcRenderer.invoke('stat-file', filePath),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  scanFolderAsync: (folderPath) => ipcRenderer.invoke('scan-folder-async', folderPath),
  watchFolder: (folderPath) => ipcRenderer.invoke('watch-folder', folderPath),
  path: path,
});

// Listen for scan progress events
ipcRenderer.on('scan-progress', (event, data) => {
  window.dispatchEvent(new CustomEvent('scan-progress', { detail: data }));
});

// Listen for file change events
ipcRenderer.on('file-changed', (event, data) => {
  window.dispatchEvent(new CustomEvent('file-changed', { detail: data }));
});