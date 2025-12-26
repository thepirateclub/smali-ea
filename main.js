const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const chokidar = require('chokidar');

// Handle file system operations
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    return await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
});

// Add function to get file stats
ipcMain.handle('stat-file', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    throw error;
  }
});

ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections']
  });
  return result.filePaths;
});

// Async folder scanning with progress updates
ipcMain.handle('scan-folder-async', async (event, folderPath, options = {}) => {
  const { onProgress } = options;
  const files = [];
  const queue = [folderPath];
  let processedCount = 0;
  let totalFiles = 0;

  // First pass: count total files
  const countQueue = [folderPath];
  while (countQueue.length > 0) {
    const currentPath = countQueue.shift();
    try {
      const items = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        const stats = await fs.promises.stat(fullPath);
        if (stats.isDirectory()) {
          countQueue.push(fullPath);
        } else if (stats.isFile()) {
          totalFiles++;
        }
      }
    } catch (error) {
      console.warn(`Error accessing directory ${currentPath}:`, error.message);
    }
  }

  // Second pass: collect files
  const allowedExtensions = ['.smali', '.xml', '.json', '.yml', '.yaml', '.txt', '.properties'];
  while (queue.length > 0) {
    const currentPath = queue.shift();
    try {
      const items = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        const stats = await fs.promises.stat(fullPath);
        
        if (stats.isDirectory()) {
          queue.push(fullPath);
        } else if (stats.isFile() && allowedExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
          files.push({ 
            path: fullPath, 
            size: stats.size,
            mtime: stats.mtime 
          });
          processedCount++;
          
          // Send progress update periodically
          if (onProgress && processedCount % 50 === 0) {
            const progress = Math.round((processedCount / totalFiles) * 100);
            event.sender.send('scan-progress', {
              progress,
              processed: processedCount,
              total: totalFiles,
              currentFile: item.name
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Error accessing directory ${currentPath}:`, error.message);
    }
  }
  
  // Final progress update
  if (onProgress) {
    event.sender.send('scan-progress', {
      progress: 100,
      processed: processedCount,
      total: totalFiles,
      currentFile: 'Complete'
    });
  }

  return files;
});

// Watch file changes
ipcMain.handle('watch-folder', async (event, folderPath) => {
  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('change', (filePath) => {
    event.sender.send('file-changed', { type: 'change', filePath });
  });

  watcher.on('add', (filePath) => {
    event.sender.send('file-changed', { type: 'add', filePath });
  });

  watcher.on('unlink', (filePath) => {
    event.sender.send('file-changed', { type: 'unlink', filePath });
  });

  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'), // Icon file if available
    autoHideMenuBar: true, // Hide menu bar by default
    backgroundColor: '#111827' // Match the app's dark theme
  });

  // Load the index.html file
  win.loadFile('index.html');

  // Open the DevTools if needed for debugging
  // win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});