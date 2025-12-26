import { domCache } from './DOMCache.js';

export class Header {
  constructor() {
    this.domCache = domCache;
    this.init();
  }

  init() {
    // Header is primarily HTML, but we can add any header-specific functionality here
    // For now, we'll just ensure the header elements are properly cached
    this.bindEvents();
  }

  bindEvents() {
    // Add event listeners for header buttons
    const patchLicenseBtn = document.querySelector('.license-btn');
    const exportBtn = document.querySelector('button[onclick="exportProject()"]');
    const statsBtn = document.querySelector('button[onclick="showStats()"]');

    if (patchLicenseBtn) {
      patchLicenseBtn.addEventListener('click', () => {
        if (window.patchLicenseChecks) {
          window.patchLicenseChecks();
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (window.exportProject) {
          window.exportProject();
        }
      });
    }

    if (statsBtn) {
      statsBtn.addEventListener('click', () => {
        if (window.showStats) {
          window.showStats();
        }
      });
    }
  }
}