/**
 * Performance Optimizations for Smali Editor & Analyzer
 * Addresses issues with large file imports, search, and UI responsiveness
 */

// 1. Optimized folder scanning with better progress handling and chunked processing
ipcMain.handle('scan-folder-optimized', async (event, folderPath, options = {}) => {
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

// 2. Optimized file search with indexing and debouncing
function createFileSearchIndex(files) {
  const index = new Map();
  const searchableFiles = Array.from(files.entries());
  
  // Create index in chunks to prevent blocking
  for (let i = 0; i < searchableFiles.length; i += 1000) {
    const chunk = searchableFiles.slice(i, i + 1000);
    chunk.forEach(([path, fileData]) => {
      const fileName = path.toLowerCase();
      index.set(path, {
        fileName,
        content: fileData.content ? fileData.content.toLowerCase() : '',
        pathParts: path.toLowerCase().split('/')
      });
    });
    
    // Yield to event loop
    await new Promise(resolve => setImmediate(resolve));
  }
  
  return index;
}

// 3. Optimized license patching with extended patterns
function patchLicenseChecksOptimized() {
  // Extended patterns to catch more license-related files
  const licensePatterns = [
    /license/i, /licensing/i, /licensecheck/i, /checkLicense/i,
    /islicensed/i, /validatelicense/i, /licensevalid/i,
    /offlinelicense/i, /ilicense/i, /licensemanager/i,
    /licenseservice/i, /licenseverif/i, /haslicense/i,
    /integrity/i, /gameclient/i, /drm/i, /verification/i, /verify/i,
    /checksum/i, /signature/i, /auth/i, /authenticate/i,
    /play/i, /googleplay/i, /billing/i, /purchase/i
  ];
  
  let patchedCount = 0;
  const patchedFiles = [];
  
  for (const [path, fileData] of state.files) {
    if (!path.endsWith('.smali')) continue;
    
    const fileName = path.toLowerCase();
    const isLicenseFile = licensePatterns.some(p => p.test(fileName));
    
    // Also check if file content contains license-related keywords
    if (!isLicenseFile && fileData.content) {
      const content = fileData.content.toLowerCase();
      const hasLicenseKeywords = licensePatterns.some(p => p.test(content));
      if (!hasLicenseKeywords) continue;
    }
    
    if (isLicenseFile || (fileData.content && licensePatterns.some(p => p.test(fileData.content.toLowerCase())))) {
      const methods = [];
      const methodRegex = /^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/gm;
      let match;
      
      // Extract methods more efficiently
      const lines = fileData.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/);
        if (m) {
          methods.push({
            name: m[2],
            modifiers: m[1].trim(),
            params: m[3],
            returnType: m[4],
            line: i + 1
          });
        }
      }
      
      let modified = false;
      for (const method of methods) {
        const ret = method.returnType;
        // Patch boolean methods to return true (licensed)
        if (ret === 'Z') {
          const oldCode = getMethodCodeByLine(path, method.line);
          if (oldCode && !oldCode.includes('# PATCHED')) {
            const stubCode = `.method ${method.modifiers} ${method.name}(${method.params})Z
    .locals 1
    # PATCHED - License check bypassed
    const/4 v0, 0x1
    return v0
.end method`;
            
            fileData.content = fileData.content.replace(oldCode, stubCode);
            modified = true;
            patchedCount++;
            
            if (!state.fileChanges.has(path)) {
              state.fileChanges.set(path, []);
            }
            state.fileChanges.get(path).push({
              methodName: method.name,
              oldCode,
              newCode: stubCode,
              timestamp: Date.now()
            });
          }
        }
        // Patch void methods (just return)
        else if (ret === 'V' && /check|verify|validate|license|auth|verify/i.test(method.name)) {
          const oldCode = getMethodCodeByLine(path, method.line);
          if (oldCode && !oldCode.includes('# PATCHED')) {
            const stubCode = `.method ${method.modifiers} ${method.name}(${method.params})V
    .locals 0
    # PATCHED - License check bypassed
    return-void
.end method`;
            
            fileData.content = fileData.content.replace(oldCode, stubCode);
            modified = true;
            patchedCount++;
            
            if (!state.fileChanges.has(path)) {
              state.fileChanges.set(path, []);
            }
            state.fileChanges.get(path).push({
              methodName: method.name,
              oldCode,
              newCode: stubCode,
              timestamp: Date.now()
            });
          }
        }
        // Patch methods that return objects (return null to bypass checks)
        else if (ret !== 'V' && /check|verify|validate|license|auth|verify/i.test(method.name)) {
          const oldCode = getMethodCodeByLine(path, method.line);
          if (oldCode && !oldCode.includes('# PATCHED')) {
            const stubCode = `.method ${method.modifiers} ${method.name}(${method.params})${ret}
    .locals 1
    # PATCHED - License check bypassed
    const/4 v0, 0x0
    return-object v0
.end method`;
            
            fileData.content = fileData.content.replace(oldCode, stubCode);
            modified = true;
            patchedCount++;
            
            if (!state.fileChanges.has(path)) {
              state.fileChanges.set(path, []);
            }
            state.fileChanges.get(path).push({
              methodName: method.name,
              oldCode,
              newCode: stubCode,
              timestamp: Date.now()
            });
          }
        }
      }
      
      if (modified) {
        fileData.modified = true;
        patchedFiles.push(path.split('/').pop());
      }
    }
  }
  
  if (patchedCount > 0) {
    updateChangesTab();
    renderFileTree();
    
    if (state.currentFile && state.files.get(state.currentFile)?.modified) {
      DOM.codeEditor.value = state.files.get(state.currentFile).content;
      syncEditorGeometry();
      updateLineNumbers();
      updateSyntaxHighlight();
    }
    
    showToast(`Пропатчено ${patchedCount} методов в ${patchedFiles.length} файлах`, 'success');
  } else {
    showToast('Файлы лицензии не найдены или уже пропатчены', 'info');
  }
}

// 4. Optimized file search with better performance for large file sets
function renderSearchResultsOptimized() {
  const query = state.searchQuery.toLowerCase();
  const parts = ['<div class="p-2 text-xs text-gray-400 uppercase font-bold">Результаты</div>'];
  let count = 0;

  // Use a more efficient search algorithm for large datasets
  const fileEntries = Array.from(state.files.entries());
  
  for (let i = 0; i < fileEntries.length && count < 100; i += 10) {
    // Process in small batches to maintain UI responsiveness
    const batch = fileEntries.slice(i, i + 10);
    for (const [path] of batch) {
      if (path.toLowerCase().includes(query)) {
        const fileName = path.split('/').pop();
        const safePath = path.replace(/"/g, '&quot;');
        parts.push(`
          <div class="file-tree-item px-2 py-1 cursor-pointer rounded text-sm truncate"
               onclick="openFile('${safePath}')" data-path="${safePath}" title="${path}">
            <span class="text-yellow-400">📄</span> ${fileName}
          </div>
        `);
        count++;
        if (count >= 100) break;
      }
    }
    
    // Yield to event loop to keep UI responsive
    await new Promise(resolve => setImmediate(resolve));
  }
  
  DOM.fileTree.innerHTML = parts.join('');
}

// 5. Optimized method extraction with better indexing
function extractMethodsOptimized(content, filePath) {
  const methods = [];
  const lines = content.split('\n');
  let currentLine = 0;
  
  while (currentLine < lines.length) {
    const line = lines[currentLine];
    const m = line.match(/^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/);
    
    if (m) {
      // Find the end of this method
      let endLine = currentLine;
      for (let j = currentLine + 1; j < lines.length; j++) {
        if (lines[j].trim() === '.end method') {
          endLine = j;
          break;
        }
      }
      
      methods.push({
        name: m[2],
        modifiers: m[1].trim(),
        params: m[3],
        returnType: m[4],
        line: currentLine + 1,
        startLine: currentLine,
        endLine: endLine,
        file: filePath,
        nameLower: m[2].toLowerCase()
      });
      
      currentLine = endLine + 1;
    } else {
      currentLine++;
    }
  }
  
  return methods;
}

// 6. Optimized method indexing for faster search
function buildMethodIndexOptimized() {
  state.methods = [];
  state.methodsIndex = new Map();
  
  // Process files in batches to maintain responsiveness
  const fileEntries = Array.from(state.files.entries());
  for (let i = 0; i < fileEntries.length; i += 50) {
    const batch = fileEntries.slice(i, i + 50);
    
    for (const [path, fileData] of batch) {
      if (path.endsWith('.smali') && fileData.content) {
        const fileMethods = extractMethodsOptimized(fileData.content, path);
        const startIndex = state.methods.length;
        
        state.methods.push(...fileMethods);
        
        // Index methods by first 2 characters of name for faster search
        for (let j = 0; j < fileMethods.length; j++) {
          const method = fileMethods[j];
          const key = method.nameLower.substring(0, 2);
          if (key.length >= 2) {
            if (!state.methodsIndex.has(key)) {
              state.methodsIndex.set(key, []);
            }
            state.methodsIndex.get(key).push(startIndex + j);
          }
        }
      }
    }
    
    // Yield to event loop to maintain UI responsiveness
    await new Promise(resolve => setImmediate(resolve));
  }
}

// 7. Optimized editor rendering for large files
function updateSyntaxHighlightOptimized() {
  if (!state.currentFile) return;
  
  const content = state.files.get(state.currentFile)?.content || '';
  
  // For very large files, use a more efficient highlighting approach
  if (content.length > 100000) { // 100KB+
    // Use a simpler highlighting approach for large files
    const highlighted = content
      .replace(/(#.*)/g, '<span class="smali-comment">$1</span>')
      .replace(/(\.class|\.super|\.implements|\.field|\.method|\.end|\.param|\.annotation|\.line)/g, '<span class="smali-directive">$1</span>')
      .replace(/(public|private|protected|static|final|synchronized|constructor)/g, '<span class="smali-modifier">$1</span>')
      .replace(/(L[\w\/$]+;)/g, '<span class="smali-type">$1</span>')
      .replace(/(\"[^\"]*\")/g, '<span class="smali-string">$1</span>');
    
    DOM.codeHighlight.innerHTML = highlighted.replace(/\n/g, '<br>');
  } else {
    // Use the original detailed highlighting for smaller files
    // (implementation would be the original syntax highlighting code)
  }
}

// 8. Optimized changes tab with virtual scrolling for large change sets
function updateChangesTabOptimized() {
  const changedFiles = Array.from(state.fileChanges.entries()).filter(([_, changes]) => changes.length > 0);
  
  DOM.changesCount.textContent = changedFiles.length;
  DOM.changesCount.classList.toggle('hidden', changedFiles.length === 0);
  DOM.totalChanges.textContent = `${changedFiles.length} файлов`;
  
  if (changedFiles.length === 0) {
    DOM.changesList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Нет изменений</p>';
    return;
  }
  
  // For large numbers of changed files, implement virtual scrolling or pagination
  const MAX_DISPLAY = 100;
  const displayFiles = changedFiles.slice(0, MAX_DISPLAY);
  
  const parts = displayFiles.map(([path, changes]) => {
    const fileName = path.split('/').pop();
    const isSelected = state.selectedChangeFile === path;
    return `
      <div class="change-item p-3 cursor-pointer ${isSelected ? 'selected' : ''}" onclick="selectChangeFile('${path.replace(/'/g, "\\'")}')">
        <div class="flex items-center justify-between">
          <span class="font-medium text-sm truncate" title="${path}">${fileName}</span>
          <span class="text-xs text-blue-400">${changes.length} изм.</span>
        </div>
        <div class="text-xs text-gray-500 mt-1 truncate">${path}</div>
      </div>
    `;
  });
  
  if (changedFiles.length > MAX_DISPLAY) {
    parts.push(`<div class="p-3 text-center text-sm text-gray-500">Показано ${MAX_DISPLAY} из ${changedFiles.length} файлов</div>`);
  }
  
  DOM.changesList.innerHTML = parts.join('');
}

// 9. Optimized method list rendering with virtual scrolling
function renderMethodListOptimized() {
  const search = DOM.methodSearch.value.toLowerCase().trim();
  
  if (state.methodSearchScope === 'project') {
    if (search.length < 2) {
      DOM.methodList.innerHTML = `<div class="flex flex-col items-center justify-center h-40 text-gray-500 text-sm p-4 text-center select-none">
        <span class="text-2xl mb-2 opacity-50">🔍</span><p>Введите минимум 2 символа</p>
      </div>`;
      return;
    }
    
    let filtered = [];
    const searchKey = search.substring(0, 2);
    
    if (state.methodsIndex?.has(searchKey)) {
      const indices = state.methodsIndex.get(searchKey);
      // Limit results to prevent UI blocking
      for (const idx of indices.slice(0, 100)) {
        if (filtered.length >= 50) break;
        const m = state.methods[idx];
        if (m.nameLower.includes(search)) filtered.push(m);
      }
    }
    
    if (filtered.length === 0) {
      DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Ничего не найдено</p>';
      return;
    }
    renderListItems(DOM.methodList, filtered, true);
    return;
  }
  
  if (!state.currentFile) {
    DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Выберите файл</p>';
    return;
  }
  
  const fileMethods = state.methods.filter(m => m.file === state.currentFile);
  if (fileMethods.length === 0) {
    DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Нет методов</p>';
    return;
  }
  
  const filtered = search ? fileMethods.filter(m => m.nameLower.includes(search)) : fileMethods;
  if (filtered.length === 0) {
    DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Не найдено</p>';
    return;
  }
  renderListItems(DOM.methodList, filtered, false);
}

// 10. Overall performance improvements using Web Workers where possible
// For heavy computations, consider offloading to Web Workers
function processLargeFileSet(filePaths) {
  return new Promise((resolve, reject) => {
    // This would be implemented with a Web Worker in a real scenario
    // to handle large file processing without blocking the UI
    const results = [];
    
    // Process files in chunks to prevent blocking
    async function processChunk(startIndex, chunkSize) {
      const endIndex = Math.min(startIndex + chunkSize, filePaths.length);
      for (let i = startIndex; i < endIndex; i++) {
        // Process individual file
        results.push(await processFile(filePaths[i]));
        
        // Yield to event loop every few files
        if ((i - startIndex) % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
      
      if (endIndex < filePaths.length) {
        await processChunk(endIndex, chunkSize);
      } else {
        resolve(results);
      }
    }
    
    processChunk(0, 50); // Process 50 files at a time
  });
}

// Helper function for async processing
async function processFile(filePath) {
  // Implementation for processing individual file
  return { path: filePath, status: 'processed' };
}

// Export the optimized functions
module.exports = {
  patchLicenseChecksOptimized,
  renderSearchResultsOptimized,
  extractMethodsOptimized,
  buildMethodIndexOptimized,
  updateSyntaxHighlightOptimized,
  updateChangesTabOptimized,
  renderMethodListOptimized,
  processLargeFileSet
};