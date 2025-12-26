import { domCache } from './DOMCache.js';
import { globalState } from './State.js';

export class Sidebar {
  constructor() {
    this.domCache = domCache;
    this.state = globalState;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const dropZone = this.domCache.get('dropZone');
    const fileInput = this.domCache.get('fileInput');
    const searchFiles = this.domCache.get('searchFiles');
    
    if (dropZone) {
      dropZone.addEventListener('click', this.handleDropZoneClick.bind(this));
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', this.handleFileInputChange.bind(this));
    }
    
    if (searchFiles) {
      searchFiles.addEventListener('input', this.handleFileSearch.bind(this));
    }
  }

  handleDropZoneClick() {
    const fileInput = this.domCache.get('fileInput');
    fileInput.click();
  }

  handleFileInputChange(e) {
    const files = Array.from(e.target.files);
    if (window.handleFileSelect) {
      window.handleFileSelect(e);
    }
  }

  handleFileSearch(e) {
    if (window.handleFileSearch) {
      window.handleFileSearch(e);
    }
  }

  // Method to render the file tree
  renderFileTree() {
    if (window.renderFileTree) {
      window.renderFileTree();
    }
  }

  // Method to add a file to the tree
  addFileToTree(path, file) {
    if (window.addFileToTree) {
      window.addFileToTree(path, file);
    }
  }
}