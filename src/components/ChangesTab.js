import { domCache } from './DOMCache.js';
import { globalState } from './State.js';

export class ChangesTab {
  constructor() {
    this.domCache = domCache;
    this.state = globalState;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Add event for revert all changes button
    const revertAllBtn = document.querySelector('button[onclick="revertAllChanges()"]');
    if (revertAllBtn) {
      revertAllBtn.addEventListener('click', this.revertAllChanges.bind(this));
    }
    
    // Add event for revert selected file button
    const revertFileBtn = this.domCache.get('revertFileBtn');
    if (revertFileBtn) {
      revertFileBtn.addEventListener('click', this.revertSelectedFile.bind(this));
    }
  }

  revertAllChanges() {
    if (window.revertAllChanges) {
      window.revertAllChanges();
    }
  }

  revertSelectedFile() {
    if (window.revertSelectedFile) {
      window.revertSelectedFile();
    }
  }

  // Method to render the changes list
  renderChangesList() {
    if (window.renderChangesList) {
      window.renderChangesList();
    }
  }

  // Method to track file changes
  trackChange(filePath, action) {
    if (window.trackChange) {
      window.trackChange(filePath, action);
    }
  }

  // Method to format time ago
  formatTimeAgo(date) {
    if (window.formatTimeAgo) {
      return window.formatTimeAgo(date);
    }
  }
}