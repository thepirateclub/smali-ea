import { domCache } from './DOMCache.js';

export class Resizer {
  constructor() {
    this.domCache = domCache;
    this.isResizing = false;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const sidebarResizer = this.domCache.get('sidebarResizer');
    const sidebar = this.domCache.get('sidebar');
    
    if (sidebarResizer && sidebar) {
      sidebarResizer.addEventListener('mousedown', (e) => {
        this.isResizing = true;
        sidebarResizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!this.isResizing) return;
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        sidebar.style.width = newWidth + 'px';
      });
      
      document.addEventListener('mouseup', () => {
        if (this.isResizing) {
          this.isResizing = false;
          sidebarResizer.classList.remove('active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }
  }
}