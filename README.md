# Smali Editor & Analyzer

A powerful Smali editor and analyzer tool with dependency visualization and method modification capabilities.

## Performance Improvements

The application has been optimized following Electron performance best practices:

- **Async File System Operations**: All file operations now use async/await to prevent blocking the main thread
- **Efficient Folder Scanning**: Implemented chunked processing and yielding to event loop to maintain UI responsiveness during large folder scans
- **File Watching Optimizations**: Added chokidar performance options and debounce mechanisms to prevent excessive file change events
- **Syntax Highlighting**: Implemented adaptive highlighting - uses simplified approach for large files (>100KB) and detailed approach for smaller files
- **Line Number Rendering**: Virtual scrolling for line numbers in large files (>5000 lines) to prevent DOM performance issues
- **Memory Management**: Proper cleanup of event listeners and timers to prevent memory leaks
- **Virtual Rendering**: For large dependency graphs and large numbers of lines, virtual rendering is used to maintain performance

## Features

- **Smali Code Editor**: Syntax highlighting for Smali code with line numbers
- **Dependency Analysis**: Visualize dependencies between classes and methods
- **Method Extraction**: Extract and analyze methods from Smali files
- **File Management**: Drag-and-drop file loading with search functionality
- **License Patching**: Automated patching of license checks in Smali files
- **Change Tracking**: Track and review changes made to files

## Architecture

The application has been modularized into the following components:

- `/src/index.html` - Main HTML structure
- `/src/css/styles.css` - All CSS styles
- `/src/js/main.js` - Main JavaScript application logic
- `/src/components/` - Reusable UI components (future expansion)

## Installation and Usage

1. Install Node.js and npm
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

## Usage

1. Run the application
2. Click on the "Drag and drop project folder" area or use the folder selection dialog in Electron
3. Select a folder with Smali files
4. Use different tabs for editing, dependency analysis, and method modification

## Building for Distribution

To build the application to an executable:

```bash
npm install -g electron-builder
npm run dist
```

## Compatibility

- In browser: partial functionality (drag & drop files only)
- In Electron: full functionality (read/write files to disk, folder selection)

## Project Files

The application supports the following file types:
- `.smali` - Smali files
- `.xml` - XML files
- `.json` - JSON files
- `.yml`, `.yaml` - configuration files
- `.txt`, `.properties` - text files

## Author

Smali Editor Team