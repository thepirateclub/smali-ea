import { domCache } from './DOMCache.js';

export class Tabs {
  constructor() {
    this.domCache = domCache;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const tabButtons = this.domCache.getTabButtons();
    if (tabButtons) {
      tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabName = e.target.dataset.tab || e.target.parentElement.dataset.tab;
          if (tabName && window.switchTab) {
            window.switchTab(tabName);
          }
        });
      });
    }
  }

  switchTab(tabName) {
    if (window.switchTab) {
      window.switchTab(tabName);
    }
  }

  // Method to activate a specific tab
  activateTab(tabName) {
    // Remove active class from all tab buttons
    const tabButtons = this.domCache.getTabButtons();
    if (tabButtons) {
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
      });
    }

    // Find and activate the corresponding button
    const activeBtn = Array.from(tabButtons).find(btn => btn.dataset.tab === tabName);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Show selected tab content
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(tab => {
      tab.style.display = 'none';
    });

    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
      selectedTab.style.display = 'flex';
    }
  }
}