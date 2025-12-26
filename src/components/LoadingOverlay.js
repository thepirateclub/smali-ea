import { domCache } from './DOMCache.js';

export class LoadingOverlay {
  constructor() {
    this.domCache = domCache;
    this.init();
  }

  init() {
    // Loading overlay is primarily function-based, so we just need to ensure they work
  }

  // Show loading overlay
  showLoadingOverlay(title = 'Загрузка...', status = 'Подготовка...') {
    if (window.showLoadingOverlay) {
      window.showLoadingOverlay(title, status);
    } else {
      // Fallback implementation if the window function doesn't exist
      this.fallbackShowLoadingOverlay(title, status);
    }
  }

  // Fallback implementation for showing loading overlay
  fallbackShowLoadingOverlay(title, status) {
    const overlay = this.domCache.get('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      
      const titleEl = this.domCache.get('loadingTitle');
      const statusEl = this.domCache.get('loadingStatus');
      
      if (titleEl) titleEl.textContent = title;
      if (statusEl) statusEl.textContent = status;
    }
  }

  // Hide loading overlay
  hideLoadingOverlay() {
    if (window.hideLoadingOverlay) {
      window.hideLoadingOverlay();
    } else {
      // Fallback implementation
      this.fallbackHideLoadingOverlay();
    }
  }

  // Fallback implementation for hiding loading overlay
  fallbackHideLoadingOverlay() {
    const overlay = this.domCache.get('loadingOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  // Update loading progress
  updateLoading(percent, status, processed, total) {
    if (window.updateLoading) {
      window.updateLoading(percent, status, processed, total);
    }
    
    // Also update the DOM elements directly
    const percentEl = this.domCache.get('loadingPercent');
    const statusEl = this.domCache.get('loadingStatus');
    const barEl = this.domCache.get('loadingBar');
    const countEl = this.domCache.get('loadingCount');
    
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (statusEl) statusEl.textContent = status;
    if (barEl) barEl.style.width = `${percent}%`;
    if (countEl) countEl.textContent = processed ? `${processed}/${total}` : '';
  }

  // Method to update progress
  updateProgress(progress, status, processed, total) {
    this.updateLoading(progress * 100, status, processed, total);
  }
}