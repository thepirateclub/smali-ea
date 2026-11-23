const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

let mainWindow = null;
let folderWatcher = null;

// Show the "open folder" dialog and notify the renderer with the selection.
// Used by both the File > Open Folder menu item and the CmdOrCtrl+O accelerator.
async function openFolderDialog() {
  if (!mainWindow) return;
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Folder',
    properties: ['openDirectory', 'multiSelections']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    win.webContents.send('folder-selected', result.filePaths);
  }
}

// Show the "open file" dialog and notify the renderer with the selection.
async function openFileSingleDialog() {
  if (!mainWindow) return;
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    title: 'Open File',
    properties: ['openFile'],
    filters: [
      { name: 'Smali Files', extensions: ['smali'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    win.webContents.send('file-selected', result.filePaths);
  }
}

// Create application menu
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+O',
          click: openFolderDialog
        },
        { type: 'separator' },
        {
          label: 'Open File',
          click: openFileSingleDialog
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        {
          role: 'forceReload',
          accelerator: 'CmdOrCtrl+R'
        },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [])
      ]
    },
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Github',
          click: () => {
            require('electron').shell.openExternal('https://github.com/thepirateclub/smali-ea');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: async () => {
            const aboutInfo = `Smali Editor & Analyzer\n\nA powerful Smali editor and analyzer tool with dependency visualization and method modification capabilities.`;
            dialog.showMessageBox({
              type: 'info',
              title: 'About Smali Editor & Analyzer',
              message: 'Smali Editor & Analyzer',
              detail: aboutInfo,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];


  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'multiSelections']
  });
  if (result.canceled) return [];
  return result.filePaths;
});

// Async folder scanning with progress updates - OPTIMIZED
ipcMain.handle('scan-folder-async', async (event, folderPath, options = {}) => {
  const { onProgress } = options;
  const files = [];
  const queue = [folderPath];
  let processedCount = 0;
  let totalFiles = 0;

  // First pass: count total files using a more efficient approach
  const countQueue = [folderPath];
  while (countQueue.length > 0) {
    // Process in chunks to prevent blocking the main thread
    const batch = countQueue.splice(0, 100);
    for (const currentPath of batch) {
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

    // Yield to event loop periodically
    await new Promise(resolve => setImmediate(resolve));
  }

  // Second pass: collect files with chunked processing
  const allowedExtensions = ['.smali', '.xml', '.json', '.yml', '.yaml', '.txt', '.properties'];
  while (queue.length > 0) {
    // Process in chunks to prevent blocking
    const batch = queue.splice(0, 50);
    for (const currentPath of batch) {
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
            if (onProgress && processedCount % 100 === 0) {
              const progress = Math.round((processedCount / totalFiles) * 100);
              event.sender.send('scan-progress', {
                progress,
                processed: processedCount,
                total: totalFiles,
                currentFile: item.name
              });

              // Yield to event loop to prevent blocking
              await new Promise(resolve => setImmediate(resolve));
            }
          }
        }
      } catch (error) {
        console.warn(`Error accessing directory ${currentPath}:`, error.message);
      }
    }

    // Yield to event loop periodically
    await new Promise(resolve => setImmediate(resolve));
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
  // Close any previous watcher to avoid leaking watchers on repeated calls
  if (folderWatcher) {
    await folderWatcher.close();
    folderWatcher = null;
  }

  folderWatcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  folderWatcher.on('change', (filePath) => {
    event.sender.send('file-changed', { type: 'change', filePath });
  });

  folderWatcher.on('add', (filePath) => {
    event.sender.send('file-changed', { type: 'add', filePath });
  });

  folderWatcher.on('unlink', (filePath) => {
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
    autoHideMenuBar: false, // Show menu bar by default
    backgroundColor: '#111827' // Match the app's dark theme
  });

  mainWindow = win;
  win.on('closed', () => {
    mainWindow = null;
  });

  // Load the index.html file
  win.loadFile('index.html');

  // Open the DevTools if needed for debugging
  // win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createApplicationMenu(); // Create the application menu
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