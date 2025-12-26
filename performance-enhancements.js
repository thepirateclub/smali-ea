/**
 * Performance Enhancements for Smali Editor & Analyzer
 * Based on Electron performance best practices
 */

// 1. Memory Management: Proper event listener cleanup
class MemoryManager {
  constructor() {
    this.eventListeners = new Map();
    this.timers = new Set();
    this.intervals = new Set();
  }

  // Track event listeners for later cleanup
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    const key = `${element.tagName}-${event}-${handler.name || 'anonymous'}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push({ element, event, handler });
  }

  // Remove all tracked event listeners
  removeAllEventListeners() {
    for (const [key, listeners] of this.eventListeners) {
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    }
    this.eventListeners.clear();
  }

  // Track timers for cleanup
  setTimeout(callback, delay) {
    const timerId = setTimeout(() => {
      this.timers.delete(timerId);
      callback();
    }, delay);
    this.timers.add(timerId);
    return timerId;
  }

  clearTimeout(timerId) {
    clearTimeout(timerId);
    this.timers.delete(timerId);
  }

  // Track intervals for cleanup
  setInterval(callback, interval) {
    const intervalId = setInterval(callback, interval);
    this.intervals.add(intervalId);
    return intervalId;
  }

  clearInterval(intervalId) {
    clearInterval(intervalId);
    this.intervals.delete(intervalId);
  }

  // Cleanup all resources
  cleanup() {
    this.removeAllEventListeners();
    this.timers.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    this.timers.clear();
    this.intervals.clear();
  }
}

// 2. Optimized file search with indexing and debouncing
class FileSearchIndex {
  constructor() {
    this.index = new Map();
    this.searchCache = new Map();
  }

  async createIndex(files) {
    this.index.clear();
    const fileEntries = Array.from(files.entries());
    
    // Create index in chunks to prevent blocking
    for (let i = 0; i < fileEntries.length; i += 100) {
      const chunk = fileEntries.slice(i, i + 100);
      for (const [path, fileData] of chunk) {
        const fileName = path.toLowerCase();
        this.index.set(path, {
          fileName,
          content: fileData.content ? fileData.content.toLowerCase() : '',
          pathParts: path.toLowerCase().split('/')
        });
      }
      
      // Yield to event loop to maintain UI responsiveness
      await new Promise(resolve => setImmediate(resolve));
    }
    
    return this.index;
  }

  // Debounced search to prevent excessive processing
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  search(query, maxResults = 100) {
    const cacheKey = `${query}-${maxResults}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [path, data] of this.index) {
      if (results.length >= maxResults) break;
      
      if (data.fileName.includes(lowerQuery) || 
          data.content.includes(lowerQuery) ||
          data.pathParts.some(part => part.includes(lowerQuery))) {
        results.push(path);
      }
    }

    // Cache results for future queries
    this.searchCache.set(cacheKey, results);
    return results;
  }

  clearCache() {
    this.searchCache.clear();
  }
}

// 3. Optimized method extraction with caching
class MethodExtractor {
  constructor() {
    this.methodCache = new Map();
    this.regex = /^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/gm;
  }

  extractMethods(content, filePath) {
    // Check cache first
    const cacheKey = `${filePath}-${content.length}`;
    if (this.methodCache.has(cacheKey)) {
      return this.methodCache.get(cacheKey);
    }

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
          nameLower: m[2].toLowerCase(),
          signature: `${m[2]}(${m[3]})${m[4]}`
        });
        
        currentLine = endLine + 1;
      } else {
        currentLine++;
      }
    }
    
    // Cache the results
    this.methodCache.set(cacheKey, methods);
    return methods;
  }

  clearCache() {
    this.methodCache.clear();
  }
}

// 4. Optimized license patching with pattern matching
class LicensePatcher {
  constructor() {
    // Extended patterns to catch more license-related files
    this.licensePatterns = [
      /license/i, /licensing/i, /licensecheck/i, /checkLicense/i,
      /islicensed/i, /validatelicense/i, /licensevalid/i,
      /offlinelicense/i, /ilicense/i, /licensemanager/i,
      /licenseservice/i, /licenseverif/i, /haslicense/i,
      /integrity/i, /gameclient/i, /drm/i, /verification/i, /verify/i,
      /checksum/i, /signature/i, /auth/i, /authenticate/i,
      /play/i, /googleplay/i, /billing/i, /purchase/i
    ];
  }

  async patchLicenseChecks(state) {
    let patchedCount = 0;
    const patchedFiles = [];
    
    const fileEntries = Array.from(state.files.entries());
    
    for (let i = 0; i < fileEntries.length; i += 10) { // Process in batches
      const batch = fileEntries.slice(i, i + 10);
      
      for (const [path, fileData] of batch) {
        if (!path.endsWith('.smali')) continue;
        
        const fileName = path.toLowerCase();
        const isLicenseFile = this.licensePatterns.some(p => p.test(fileName));
        
        // Also check if file content contains license-related keywords
        if (!isLicenseFile && fileData.content) {
          const content = fileData.content.toLowerCase();
          const hasLicenseKeywords = this.licensePatterns.some(p => p.test(content));
          if (!hasLicenseKeywords) continue;
        }
        
        if (isLicenseFile || (fileData.content && 
            this.licensePatterns.some(p => p.test(fileData.content.toLowerCase())))) {
          
          const methods = this.extractMethods(fileData.content);
          let modified = false;
          
          for (const method of methods) {
            const ret = method.returnType;
            
            // Patch boolean methods to return true (licensed)
            if (ret === 'Z') {
              const oldCode = this.getMethodCode(fileData.content, method.startLine);
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
              const oldCode = this.getMethodCode(fileData.content, method.startLine);
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
              const oldCode = this.getMethodCode(fileData.content, method.startLine);
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
      
      // Yield to event loop to maintain UI responsiveness
      await new Promise(resolve => setImmediate(resolve));
    }
    
    if (patchedCount > 0) {
      // Update UI components
      if (window.updateChangesTab) window.updateChangesTab();
      if (window.renderFileTree) window.renderFileTree();
      
      if (state.currentFile && state.files.get(state.currentFile)?.modified) {
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
          codeEditor.value = state.files.get(state.currentFile).content;
        }
        if (window.syncEditorGeometry) window.syncEditorGeometry();
        if (window.updateLineNumbers) window.updateLineNumbers();
        if (window.updateSyntaxHighlight) window.updateSyntaxHighlight();
      }
      
      if (window.showToast) {
        window.showToast(`Пропатчено ${patchedCount} методов в ${patchedFiles.length} файлах`, 'success');
      }
    } else {
      if (window.showToast) {
        window.showToast('Файлы лицензии не найдены или уже пропатчены', 'info');
      }
    }
  }

  extractMethods(content) {
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
          startLine: currentLine,
          endLine: endLine
        });
        
        currentLine = endLine + 1;
      } else {
        currentLine++;
      }
    }
    
    return methods;
  }

  getMethodCode(content, startLine) {
    const lines = content.split('\n');
    // Find the end of the method starting from startLine
    for (let i = startLine; i < lines.length; i++) {
      if (lines[i].trim() === '.end method') {
        // Return the method code from startLine to endLine
        return lines.slice(startLine - 1, i + 1).join('\n');
      }
    }
    return '';
  }
}

// 5. Optimized dependency graph with virtual rendering
class DependencyGraphOptimizer {
  constructor() {
    this.graphCache = new Map();
    this.renderCache = new Map();
  }

  async buildGraph(state) {
    const cacheKey = `graph-${Object.keys(state.project.files || {}).length}`;
    if (this.graphCache.has(cacheKey)) {
      return this.graphCache.get(cacheKey);
    }

    const nodes = [];
    const edges = [];
    
    // Create nodes for each file
    const fileEntries = Object.entries(state.project.files || {});
    for (let i = 0; i < fileEntries.length; i += 50) { // Process in batches
      const batch = fileEntries.slice(i, i + 50);
      
      for (const [filePath, file] of batch) {
        if (file.content) {
          // Extract class names and dependencies from content
          const className = this.extractClassName(file.content, filePath);
          nodes.push({
            id: filePath,
            label: className || filePath.split('/').pop(),
            refs: (state.dependencies[filePath]?.references.length || 0)
          });
          
          // Create edges for dependencies
          const dependencies = state.dependencies[filePath]?.references || [];
          for (const ref of dependencies) {
            // Find if any loaded file matches this reference
            for (const [otherPath] of fileEntries) {
              // Simple check if the file path contains the reference
              if (otherPath.includes(ref.replace(/[;\/]/g, '_').replace('L', ''))) {
                edges.push({
                  source: filePath,
                  target: otherPath
                });
              }
            }
          }
        }
      }
      
      // Yield to event loop to maintain UI responsiveness
      await new Promise(resolve => setImmediate(resolve));
    }
    
    const graph = { nodes, edges };
    this.graphCache.set(cacheKey, graph);
    return graph;
  }

  extractClassName(content, filePath) {
    // Extract class name from Smali file
    const match = content.match(/\.class\s+(?:public|private|protected)?\s*L([a-zA-Z0-9/$]+);/);
    return match ? match[1].split('/').pop() : filePath.split('/').pop();
  }

  // Virtual rendering for large graphs
  async renderGraph(graph, container) {
    if (!container) return;
    
    // Clear the graph container
    container.innerHTML = '';
    
    if (!graph.nodes || graph.nodes.length === 0) {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Нет зависимостей для отображения</div>';
      return;
    }
    
    // For large graphs, implement virtual rendering
    if (graph.nodes.length > 100) {
      this.renderVirtualGraph(graph, container);
    } else {
      this.renderFullGraph(graph, container);
    }
  }

  renderVirtualGraph(graph, container) {
    // Create a simplified visualization for large graphs
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`);
    
    // Limit the number of nodes displayed for performance
    const displayNodes = graph.nodes.slice(0, 50);
    const displayEdges = graph.edges.filter(edge => 
      displayNodes.some(node => node.id === edge.source) && 
      displayNodes.some(node => node.id === edge.target)
    );
    
    // Draw edges (dependencies)
    for (const edge of displayEdges) {
      const sourceNode = displayNodes.find(n => n.id === edge.source);
      const targetNode = displayNodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const sourceIndex = displayNodes.indexOf(sourceNode);
        const targetIndex = displayNodes.indexOf(targetNode);
        
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", (sourceIndex * 100) % container.clientWidth);
        line.setAttribute("y1", (sourceIndex * 50) % container.clientHeight);
        line.setAttribute("x2", (targetIndex * 100) % container.clientWidth);
        line.setAttribute("y2", (targetIndex * 50) % container.clientHeight);
        line.setAttribute("stroke", "#6b7280");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
      }
    }
    
    // Draw nodes (files)
    displayNodes.forEach((node, idx) => {
      const x = (idx * 100) % container.clientWidth;
      const y = (idx * 50) % container.clientHeight;
      
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "20");
      circle.setAttribute("fill", "#3b82f6");
      svg.appendChild(circle);
      
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", x);
      text.setAttribute("y", y + 5);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "white");
      text.setAttribute("font-size", "12");
      text.textContent = node.label.substring(0, 8) + (node.label.length > 8 ? "..." : "");
      svg.appendChild(text);
    });
    
    container.appendChild(svg);
  }

  renderFullGraph(graph, container) {
    // Create a full visualization for smaller graphs
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`);
    
    // Draw edges (dependencies)
    for (const edge of graph.edges) {
      const sourceNode = graph.nodes.find(n => n.id === edge.source);
      const targetNode = graph.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const sourceIndex = graph.nodes.indexOf(sourceNode);
        const targetIndex = graph.nodes.indexOf(targetNode);
        
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", (sourceIndex * 100) % container.clientWidth);
        line.setAttribute("y1", (sourceIndex * 50) % container.clientHeight);
        line.setAttribute("x2", (targetIndex * 100) % container.clientWidth);
        line.setAttribute("y2", (targetIndex * 50) % container.clientHeight);
        line.setAttribute("stroke", "#6b7280");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
      }
    }
    
    // Draw nodes (files)
    graph.nodes.forEach((node, idx) => {
      const x = (idx * 100) % container.clientWidth;
      const y = (idx * 50) % container.clientHeight;
      
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "20");
      circle.setAttribute("fill", "#3b82f6");
      svg.appendChild(circle);
      
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", x);
      text.setAttribute("y", y + 5);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "white");
      text.setAttribute("font-size", "12");
      text.textContent = node.label.substring(0, 8) + (node.label.length > 8 ? "..." : "");
      svg.appendChild(text);
    });
    
    container.appendChild(svg);
  }

  clearCache() {
    this.graphCache.clear();
    this.renderCache.clear();
  }
}

// 6. Export the optimized classes
export {
  MemoryManager,
  FileSearchIndex,
  MethodExtractor,
  LicensePatcher,
  DependencyGraphOptimizer
};

// 7. Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: [],
      memoryUsage: [],
      operationCount: 0
    };
  }

  startOperation(operationName) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        this.metrics.renderTime.push({ operation: operationName, duration });
        this.metrics.operationCount++;
        
        if (this.metrics.renderTime.length > 100) {
          this.metrics.renderTime.shift(); // Keep only last 100 measurements
        }
        
        return duration;
      }
    };
  }

  logMetrics() {
    if (this.metrics.renderTime.length > 0) {
      const avgTime = this.metrics.renderTime.reduce((sum, op) => sum + op.duration, 0) / this.metrics.renderTime.length;
      console.log(`Performance Metrics - Avg render time: ${avgTime.toFixed(2)}ms, Operations: ${this.metrics.operationCount}`);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      avgRenderTime: this.metrics.renderTime.length > 0 
        ? this.metrics.renderTime.reduce((sum, op) => sum + op.duration, 0) / this.metrics.renderTime.length
        : 0
    };
  }
}

// Export the performance monitor
export { PerformanceMonitor };