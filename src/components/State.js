// Global state management for the application
export class State {
  constructor() {
    this.files = new Map();
    this.currentFile = null;
    this.nodes = [];
    this.methods = [];
    this.methodsIndex = null;
    this.selectedMethod = null;
    this.selectedNode = null;
    this.changeHistory = [];
    this.fileChanges = new Map(); // file -> [{oldCode, newCode, methodName, timestamp}]
    this.selectedChangeFile = null;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.draggingNode = null;
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.hasMoved = false;
    this.expandedPaths = new Set();
    this.searchQuery = '';
    this.methodSearchScope = 'file';
    this.classMap = new Map();
    this.totalSize = 0;
    this.animationFrameId = null;
    this.lastLineCount = 0;
    this.fileTypeStats = {};
    this.sidebarWidth = 280;
    this.project = {};
    this.currentContent = '';
    this.fileHistory = [];
    this.changes = [];
    this.dependencies = {};
    this.graph = { nodes: [], edges: [] };
  }

  // Update a specific property in the state
  update(property, value) {
    this[property] = value;
  }

  // Get a specific property from the state
  get(property) {
    return this[property];
  }

  // Reset the state to initial values
  reset() {
    this.constructor();
  }
}

// Create a singleton instance of the state
export const globalState = new State();