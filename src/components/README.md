# Smali Editor & Analyzer - Component Architecture

This directory contains all the modular components of the application.

## Components Structure

### Core Components
- `App.js` - Main application component that orchestrates all other components
- `State.js` - Global state management
- `DOMCache.js` - DOM element caching system

### UI Components
- `Header.js` - Application header with title and main controls
- `Sidebar.js` - File tree sidebar with drag & drop functionality
- `Tabs.js` - Tab switching functionality
- `Editor.js` - Code editor with syntax highlighting
- `FileStructure.js` - File structure panel
- `Footer.js` - Status footer

### Feature Components
- `DependencyGraph.js` - Dependency visualization and analysis
- `MethodsPanel.js` - Method extraction and stubbing
- `ChangesTab.js` - Change tracking and diff view
- `Search.js` - File and method search functionality

### Utility Components
- `DragDrop.js` - Drag & drop file handling
- `Canvas.js` - Canvas rendering for dependency graph
- `LoadingOverlay.js` - Loading overlay and progress indicators
- `Notifications.js` - Toast notifications and modals
- `Resizer.js` - Resizable panels functionality