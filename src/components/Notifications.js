import { domCache } from './DOMCache.js';

export class Notifications {
  constructor() {
    this.domCache = domCache;
    this.init();
  }

  init() {
    // Notifications are primarily function-based, so we just need to ensure they work
  }

  // Show toast notification
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      // Fallback implementation if the window function doesn't exist
      this.fallbackToast(message, type);
    }
  }

  // Fallback toast implementation
  fallbackToast(message, type = 'info') {
    const toastId = 'toast-' + Date.now();
    const bgColor = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    }[type] || 'bg-blue-600';

    const toastHtml = `
      <div id="${toastId}" class="toast fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 min-w-[280px]">
        <span>${message}</span>
        <button onclick="closeToast('${toastId}')" class="ml-auto text-xl hover:text-gray-200">&times;</button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);

    // Auto remove after 5 seconds
    setTimeout(() => {
      this.closeToast(toastId);
    }, 5000);
  }

  // Close toast
  closeToast(id) {
    if (window.closeToast) {
      window.closeToast(id);
    } else {
      // Fallback implementation
      const toast = document.getElementById(id);
      if (toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }
  }

  // Show custom modal
  showCustomModal(title, content) {
    if (window.showCustomModal) {
      window.showCustomModal(title, content);
    }
  }

  // Close stats modal
  closeStatsModal() {
    if (window.closeStatsModal) {
      window.closeStatsModal();
    }
  }

  // Show statistics
  showStats() {
    if (window.showStats) {
      window.showStats();
    }
  }
}