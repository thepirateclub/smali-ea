import { State, globalState } from './State.js';
import { DOMCache, domCache } from './DOMCache.js';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { Tabs } from './Tabs.js';
import { Editor } from './Editor.js';
import { MethodsPanel } from './MethodsPanel.js';
import { DependencyGraph } from './DependencyGraph.js';
import { ChangesTab } from './ChangesTab.js';
import { Notifications } from './Notifications.js';
import { LoadingOverlay } from './LoadingOverlay.js';
import { Resizer } from './Resizer.js';

export class App {
  constructor() {
    this.state = globalState;
    this.domCache = domCache;
    this.components = {};
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    // Initialize all components
    this.components.header = new Header();
    this.components.sidebar = new Sidebar();
    this.components.tabs = new Tabs();
    this.components.editor = new Editor();
    this.components.methodsPanel = new MethodsPanel();
    this.components.dependencyGraph = new DependencyGraph();
    this.components.changesTab = new ChangesTab();
    this.components.notifications = new Notifications();
    this.components.loadingOverlay = new LoadingOverlay();
    this.components.resizer = new Resizer();

    // Initialize the application
    this.setupEventListeners();
    this.setupInitialView();
    
    this.isInitialized = true;
  }

  setupEventListeners() {
    // Listen for DOMContentLoaded to ensure all elements are available
    document.addEventListener('DOMContentLoaded', () => {
      // All components are already initialized in the constructor
      console.log('Smali Editor application initialized');
    });
  }

  setupInitialView() {
    // Set the initial active tab to editor
    if (this.components.tabs) {
      this.components.tabs.activateTab('editor');
    }
    
    // Load initial project if available
    if (window.loadInitialProject) {
      window.loadInitialProject();
    }
  }

  // Method to get a specific component
  getComponent(name) {
    return this.components[name];
  }

  // Method to run a function with error handling
  safeExecute(fn, ...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error('Error in app execution:', error);
      if (this.components.notifications) {
        this.components.notifications.showToast('Произошла ошибка', 'error');
      }
      return null;
    }
  }

  // Method to handle file operations
  handleFileOperation(operation, ...args) {
    switch(operation) {
      case 'openFile':
        if (this.components.editor) {
          return this.components.editor.openFile(...args);
        }
        break;
      case 'formatCode':
        if (this.components.editor) {
          return this.components.editor.formatCode();
        }
        break;
      case 'extractMethods':
        if (this.components.methodsPanel) {
          return this.components.methodsPanel.extractMethods(...args);
        }
        break;
      case 'analyzeDependencies':
        if (this.components.dependencyGraph) {
          return this.components.dependencyGraph.analyzeDependencies(...args);
        }
        break;
      case 'trackChange':
        if (this.components.changesTab) {
          return this.components.changesTab.trackChange(...args);
        }
        break;
      default:
        console.warn(`Unknown file operation: ${operation}`);
    }
  }
}

// Create and initialize the app instance
const app = new App();
export { app };

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await app.init();
});