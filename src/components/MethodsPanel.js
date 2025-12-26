import { domCache } from './DOMCache.js';
import { globalState } from './State.js';

export class MethodsPanel {
  constructor() {
    this.domCache = domCache;
    this.state = globalState;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const methodSearch = this.domCache.get('methodSearch');
    
    if (methodSearch) {
      methodSearch.addEventListener('input', this.handleMethodSearch.bind(this));
    }
    
    // Add event for apply stub button
    const applyStubBtn = document.getElementById('applyStubBtn');
    if (applyStubBtn) {
      applyStubBtn.addEventListener('click', this.applyStub.bind(this));
    }
    
    // Add event for stub value change
    const stubValue = this.domCache.get('stubValue');
    if (stubValue) {
      stubValue.addEventListener('change', this.handleStubValueChange.bind(this));
    }
    
    // Add event for custom value input
    const customValue = this.domCache.get('customValue');
    if (customValue) {
      customValue.addEventListener('input', this.handleCustomValueInput.bind(this));
    }
  }

  handleMethodSearch() {
    if (window.renderMethodList) {
      window.renderMethodList();
    }
  }

  handleStubValueChange() {
    const stubValue = this.domCache.get('stubValue');
    const customValueContainer = this.domCache.get('customValueContainer');
    
    if (stubValue && customValueContainer) {
      const showCustom = stubValue.value === 'custom';
      customValueContainer.classList.toggle('hidden', !showCustom);
      
      if (window.updateStubPreview) {
        window.updateStubPreview();
      }
      if (window.updateDiffPreview) {
        window.updateDiffPreview();
      }
    }
  }

  handleCustomValueInput() {
    if (window.updateStubPreview) {
      window.updateStubPreview();
    }
    if (window.updateDiffPreview) {
      window.updateDiffPreview();
    }
  }

  applyStub() {
    if (window.applyStub) {
      window.applyStub();
    }
  }

  // Method to refresh the methods panel
  refreshMethodsPanel() {
    if (window.refreshMethodsPanel) {
      window.refreshMethodsPanel();
    }
  }

  // Method to jump to a method in the editor
  jumpToMethod(lineNumber) {
    if (window.jumpToMethod) {
      window.jumpToMethod(lineNumber);
    }
  }

  // Method to extract methods from Smali code
  extractMethods(filePath, content) {
    if (window.extractMethods) {
      return window.extractMethods(filePath, content);
    }
  }
}