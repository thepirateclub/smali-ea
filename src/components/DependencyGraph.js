import { domCache } from './DOMCache.js';
import { globalState } from './State.js';

export class DependencyGraph {
  constructor() {
    this.domCache = domCache;
    this.state = globalState;
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupCanvas();
  }

  bindEvents() {
    const canvas = this.domCache.get('dependencyGraph');
    
    if (canvas) {
      canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
      canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
      canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
      canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      canvas.addEventListener('wheel', this.handleWheel.bind(this));
    }
    
    // Bind zoom controls
    const zoomInBtn = document.querySelector('button[onclick="zoomIn()"]');
    const zoomOutBtn = document.querySelector('button[onclick="zoomOut()"]');
    const resetViewBtn = document.querySelector('button[onclick="resetView()"]');
    const autoLayoutBtn = document.querySelector('button[onclick="autoLayout()"]');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (window.zoomIn) window.zoomIn();
      });
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (window.zoomOut) window.zoomOut();
      });
    }
    
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => {
        if (window.resetView) window.resetView();
      });
    }
    
    if (autoLayoutBtn) {
      autoLayoutBtn.addEventListener('click', () => {
        if (window.autoLayout) window.autoLayout();
      });
    }
  }

  setupCanvas() {
    const canvas = this.domCache.get('dependencyGraph');
    if (canvas) {
      // Set initial canvas size
      this.resizeCanvas();
    }
  }

  resizeCanvas() {
    const canvas = this.domCache.get('dependencyGraph');
    if (canvas) {
      // Set canvas size to match its display size
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }
  }

  handleMouseDown(e) {
    if (window.startDrag) {
      window.startDrag(e);
    }
  }

  handleMouseMove(e) {
    if (window.drag) {
      window.drag(e);
    }
  }

  handleMouseUp(e) {
    if (window.endDrag) {
      window.endDrag(e);
    }
  }

  handleMouseLeave(e) {
    if (window.endDrag) {
      window.endDrag(e);
    }
  }

  handleWheel(e) {
    if (window.handleZoom) {
      window.handleZoom(e);
    }
  }

  // Method to render the dependency graph
  renderDependencyGraph() {
    if (window.renderDependencyGraph) {
      window.renderDependencyGraph();
    }
  }

  // Method to build the local graph
  buildLocalGraph() {
    if (window.buildLocalGraph) {
      window.buildLocalGraph();
    }
  }

  // Method to draw the graph visualization
  drawGraphVisualization() {
    if (window.drawGraphVisualization) {
      window.drawGraphVisualization();
    }
  }

  // Method to analyze dependencies in code
  analyzeDependencies(filePath, content) {
    if (window.analyzeDependencies) {
      window.analyzeDependencies(filePath, content);
    }
  }
}