// DOM element caching system
export class DOMCache {
  constructor() {
    this.cache = new Map();
    this.init();
  }

  // Initialize and cache all DOM elements
  init() {
    // Only initialize if document is available (browser environment)
    if (typeof document !== 'undefined') {
      this.cache.set('dropZone', document.getElementById('dropZone'));
      this.cache.set('fileInput', document.getElementById('fileInput'));
      this.cache.set('fileTree', document.getElementById('fileTree'));
      this.cache.set('codeEditor', document.getElementById('codeEditor'));
      this.cache.set('codeHighlight', document.getElementById('codeHighlight'));
      this.cache.set('lineNumbers', document.getElementById('lineNumbers'));
      this.cache.set('codeArea', document.getElementById('codeArea'));
      this.cache.set('codeWrapper', document.getElementById('codeWrapper'));
      this.cache.set('canvas', document.getElementById('dependencyGraph'));
      this.cache.set('loadingOverlay', document.getElementById('loadingOverlay'));
      this.cache.set('currentFile', document.getElementById('currentFile'));
      this.cache.set('cursorPos', document.getElementById('cursorPos'));
      this.cache.set('fileSize', document.getElementById('fileSize'));
      this.cache.set('fileInfo', document.getElementById('fileInfo'));
      this.cache.set('fileStructure', document.getElementById('fileStructure'));
      this.cache.set('methodList', document.getElementById('methodList'));
      this.cache.set('methodSearch', document.getElementById('methodSearch'));
      this.cache.set('stubConfig', document.getElementById('stubConfig'));
      this.cache.set('stubPlaceholder', document.getElementById('stubPlaceholder'));
      this.cache.set('stubPreview', document.getElementById('stubPreview'));
      this.cache.set('diffPreview', document.getElementById('diffPreview'));
      this.cache.set('currentMethodCode', document.getElementById('currentMethodCode'));
      this.cache.set('returnType', document.getElementById('returnType'));
      this.cache.set('stubValue', document.getElementById('stubValue'));
      this.cache.set('stubValueContainer', document.getElementById('stubValueContainer'));
      this.cache.set('customValue', document.getElementById('customValue'));
      this.cache.set('customValueContainer', document.getElementById('customValueContainer'));
      this.cache.set('selectedMethodInfo', document.getElementById('selectedMethodInfo'));
      this.cache.set('projectStats', document.getElementById('projectStats'));
      this.cache.set('searchFiles', document.getElementById('searchFiles'));
      this.cache.set('loadingBar', document.getElementById('loadingBar'));
      this.cache.set('loadingPercent', document.getElementById('loadingPercent'));
      this.cache.set('loadingStatus', document.getElementById('loadingStatus'));
      this.cache.set('loadingTitle', document.getElementById('loadingTitle'));
      this.cache.set('loadingCount', document.getElementById('loadingCount'));
      this.cache.set('dependencyInfo', document.getElementById('dependencyInfo'));
      this.cache.set('changesList', document.getElementById('changesList'));
      this.cache.set('fileDiffView', document.getElementById('fileDiffView'));
      this.cache.set('changesCount', document.getElementById('changesCount'));
      this.cache.set('totalChanges', document.getElementById('totalChanges'));
      this.cache.set('diffFileName', document.getElementById('diffFileName'));
      this.cache.set('revertFileBtn', document.getElementById('revertFileBtn'));
      this.cache.set('sidebar', document.getElementById('sidebar'));
      this.cache.set('sidebarResizer', document.getElementById('sidebarResizer'));
      this.cache.set('dependencyGraph', document.getElementById('dependencyGraph'));
      this.cache.set('dependencyInfo', document.getElementById('dependencyInfo'));
      this.cache.set('methodsContainer', document.getElementById('methodsContainer'));
      this.cache.set('structurePanel', document.getElementById('structurePanel'));
      this.cache.set('classInfo', document.getElementById('classInfo'));
      this.cache.set('tabBtns', document.querySelectorAll('.tab-btn'));
    }
  }

  // Get a cached DOM element
  get(elementId) {
    return this.cache.get(elementId);
  }

  // Get all tab buttons
  getTabButtons() {
    return this.cache.get('tabBtns');
  }

  // Update a specific DOM element in the cache
  update(elementId, element) {
    this.cache.set(elementId, element);
  }

  // Refresh the cache for a specific element
  refresh(elementId) {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(elementId);
      this.cache.set(elementId, element);
      return element;
    }
    return null;
  }
}

// Create a singleton instance of the DOM cache
export const domCache = new DOMCache();