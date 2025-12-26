import { domCache } from './DOMCache.js';
import { globalState } from './State.js';

export class Editor {
  constructor() {
    this.domCache = domCache;
    this.state = globalState;
    this.lineHeight = 22;
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupEditor();
  }

  bindEvents() {
    const codeEditor = this.domCache.get('codeEditor');
    
    if (codeEditor) {
      codeEditor.addEventListener('input', this.handleInput.bind(this));
      codeEditor.addEventListener('scroll', this.handleScroll.bind(this));
      codeEditor.addEventListener('keydown', this.handleKeydown.bind(this));
      codeEditor.addEventListener('keyup', this.handleKeyup.bind(this));
    }
  }

  setupEditor() {
    this.updateLineNumbers();
    this.highlightSyntax();
  }

  handleInput() {
    this.updateLineNumbers();
    this.highlightSyntax();
    this.updateCursorPosition();
    
    // Update file content in state if there's a current file
    if (this.state.currentFile && this.state.project.files && this.state.project.files[this.state.currentFile]) {
      const codeEditor = this.domCache.get('codeEditor');
      this.state.project.files[this.state.currentFile].content = codeEditor.value;
      
      // Track changes
      if (window.trackChange) {
        window.trackChange(this.state.currentFile, 'edit');
      }
    }
  }

  handleScroll() {
    const lineNumbers = this.domCache.get('lineNumbers');
    const codeEditor = this.domCache.get('codeEditor');
    const codeHighlight = this.domCache.get('codeHighlight');
    
    if (lineNumbers && codeEditor) {
      lineNumbers.scrollTop = codeEditor.scrollTop;
    }
    
    if (codeHighlight && codeEditor) {
      codeHighlight.scrollTop = codeEditor.scrollTop;
    }
  }

  handleKeydown(e) {
    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const codeEditor = this.domCache.get('codeEditor');
      if (!codeEditor) return;
      
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      const text = codeEditor.value;
      
      // Insert tab character (4 spaces)
      codeEditor.value = text.substring(0, start) + '    ' + text.substring(end);
      
      // Move cursor position
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
      
      // Update display
      this.updateLineNumbers();
      this.highlightSyntax();
    }
  }

  handleKeyup() {
    this.updateCursorPosition();
  }

  updateLineNumbers() {
    const codeEditor = this.domCache.get('codeEditor');
    const lineNumbers = this.domCache.get('lineNumbers');
    
    if (!codeEditor || !lineNumbers) return;
    
    const lines = codeEditor.value.split('\n');
    let lineNumbersHtml = '';
    
    for (let i = 1; i <= lines.length; i++) {
      lineNumbersHtml += `<div>${i}</div>`;
    }
    
    lineNumbers.innerHTML = lineNumbersHtml;
  }

  highlightSyntax() {
    const codeEditor = this.domCache.get('codeEditor');
    const codeHighlight = this.domCache.get('codeHighlight');
    
    if (!codeEditor || !codeHighlight) return;
    
    const code = codeEditor.value;
    const highlighted = this.highlightSmaliSyntax(code);
    codeHighlight.innerHTML = highlighted
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/ /g, '&nbsp;');
  }

  highlightSmaliSyntax(code) {
    return code
      .replace(/(#.*)/g, '<span class="smali-comment">$1</span>')  // Comments
      .replace(/(\\.end\\s+\\w+)/g, '<span class="smali-directive">$1</span>')  // Directives
      .replace(/(\\.field|\\.method|\\.class|\\.super|\\.implements)/g, '<span class="smali-directive">$1</span>')  // Directives
      .replace(/\b(public|private|protected|static|final|synchronized|bridge|varargs|native|abstract|strictfp|synthetic|constructor|declared-synchronized)\b/g, '<span class="smali-modifier">$1</span>')  // Modifiers
      .replace(/\b(L[a-zA-Z0-9/$_]+;)/g, '<span class="smali-type">$1</span>')  // Types
      .replace(/("[^"]*")/g, '<span class="smali-string">$1</span>')  // Strings
      .replace(/\b(v\\d+|p\\d+)\b/g, '<span class="smali-register">$1</span>')  // Registers
      .replace(/\b(\\d+)\b/g, '<span class="smali-number">$1</span>')  // Numbers
      .replace(/(:[a-zA-Z0-9_]+)/g, '<span class="smali-label">$1</span>')  // Labels
      .replace(/\b(invoke-\\w+|if-\\w+|goto|return|move|const|new-instance|check-cast|instance-of)\b/g, '<span class="smali-instruction">$1</span>')  // Instructions
      .replace(/\b(invoke-\\w+)\b/g, '<span class="smali-invoke">$1</span>');  // Invoke instructions
  }

  updateCursorPosition() {
    const codeEditor = this.domCache.get('codeEditor');
    const cursorPos = this.domCache.get('cursorPos');
    
    if (!codeEditor || !cursorPos) return;
    
    const pos = codeEditor.selectionStart;
    const lines = codeEditor.value.substr(0, pos).split('\n');
    cursorPos.textContent = `Строка: ${lines.length}, Колонка: ${lines[lines.length-1].length + 1}`;
  }

  // Method to open a file in the editor
  openFile(path) {
    if (this.state.project.files && this.state.project.files[path]) {
      const file = this.state.project.files[path];
      this.state.currentFile = path;
      this.state.currentContent = file.content;
      
      const codeEditor = this.domCache.get('codeEditor');
      const currentFileEl = this.domCache.get('currentFile');
      const fileSizeEl = this.domCache.get('fileSize');
      
      if (codeEditor) {
        codeEditor.value = file.content;
      }
      
      if (currentFileEl) {
        currentFileEl.textContent = path;
      }
      
      if (fileSizeEl) {
        if (window.formatFileSize) {
          fileSizeEl.textContent = window.formatFileSize(file.size);
        } else {
          fileSizeEl.textContent = `${file.size} байт`;
        }
      }
      
      // Update editor display
      this.updateLineNumbers();
      this.highlightSyntax();
      this.updateCursorPosition();
      
      // Add to file history
      if (!this.state.fileHistory.includes(path)) {
        this.state.fileHistory.unshift(path);
      } else {
        // Move to front if already exists
        this.state.fileHistory = [path, ...this.state.fileHistory.filter(p => p !== path)];
      }
    }
  }

  // Method to format the current code
  formatCode() {
    const codeEditor = this.domCache.get('codeEditor');
    if (!codeEditor || !this.state.currentFile) return;
    
    const content = codeEditor.value;
    const formatted = this.formatSmaliCode(content);
    
    codeEditor.value = formatted;
    if (this.state.project.files && this.state.project.files[this.state.currentFile]) {
      this.state.project.files[this.state.currentFile].content = formatted;
    }
    
    this.updateLineNumbers();
    this.highlightSyntax();
    this.updateCursorPosition();
    
    // Track change
    if (window.trackChange) {
      window.trackChange(this.state.currentFile, 'format');
    }
  }

  formatSmaliCode(code) {
    // Basic formatter for Smali code
    const lines = code.split('\n');
    const result = [];
    let indentLevel = 0;
    
    for (let line of lines) {
      line = line.trim();
      
      // Adjust indent level based on special markers
      if (line.startsWith('.method') || line.startsWith('.class') || line.startsWith('.array-data') || 
          line.startsWith('.packed-switch') || line.startsWith('.sparse-switch')) {
        result.push('    '.repeat(indentLevel) + line);
        indentLevel++;
      } else if (line.startsWith('.end method') || line.startsWith('.end class') || 
                 line.startsWith('.end array-data') || line.startsWith('.end packed-switch') || 
                 line.startsWith('.end sparse-switch')) {
        indentLevel--;
        result.push('    '.repeat(indentLevel) + line);
      } else if (line.startsWith('.locals') || line.startsWith('.param') || line.startsWith('.prologue') || 
                 line.startsWith('.line') || line.match(/^:.*$/)) {  // labels
        result.push('    '.repeat(indentLevel) + line);
      } else if (line === '') {
        result.push(line);
      } else {
        result.push('    '.repeat(indentLevel) + line);
      }
    }
    
    return result.join('\n');
  }
}