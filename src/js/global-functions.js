// Global functions that are referenced in HTML
// These functions delegate to the appropriate component methods

// Initialize global functions after the app is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the app to be initialized
    const checkApp = setInterval(() => {
        if (window.app && window.app.isInitialized) {
            clearInterval(checkApp);
            setupGlobalFunctions();
        }
    }, 100);
});

function setupGlobalFunctions() {
    // Get the app instance
    const app = window.app || (window.app = findAppInstance());
    
    if (!app) {
        console.error('App instance not found');
        return;
    }
    
    // Assign global functions that delegate to component methods
    window.patchLicenseChecks = () => {
        // This function needs to be implemented in the appropriate component
        console.log('patchLicenseChecks called');
        // For now, implement the function directly
        if (!app.state.project.files) {
            showToast('Нет файлов для патчинга', 'warning');
            return;
        }
        
        let patchesApplied = 0;
        
        // Iterate through all Smali files
        for (const [path, file] of Object.entries(app.state.project.files)) {
            if (path.endsWith('.smali')) {
                const originalContent = file.content;
                
                // Look for common license/pro license check patterns
                let patchedContent = originalContent
                    // Patch license checks that return true/false based on license validation
                    .replace(/(const\/4\s+v[0-9]+\s+,?\s+0x1\s*\n\s*return\s+\w+)/g, 
                             (match) => {
                                 patchesApplied++;
                                 return `    const/4 v0, 0x0\n    return v0`;
                             })
                    // Patch license checks that compare values
                    .replace(/(if-eqz\s+v[0-9]+\s+,?\s+[^\\n]*license[^\\n]*\n\s*)(const\/4\s+v[0-9]+\s+,?\s+0x1)/g, 
                             (match, ifPart) => {
                                 patchesApplied++;
                                 return ifPart + "    const/4 v0, 0x0";
                             })
                    // Patch license validation methods that return boolean
                    .replace(/(\\.method\s+[^\\n]*is[^\\n]*[Ll]icense[^\\n]*\n(?:\s*[^\\n]*\n)*?\s*)(const\/4\s+v[0-9]+\s+,?\s+0x1\s*\n\s*return\s+\w+)(\n(?:\s*[^\\n]*\n)*?\\.end method)/g, 
                             (match, start, returnStmt, end) => {
                                 patchesApplied++;
                                 return start + "    const/4 v0, 0x0\n    return v0" + end;
                             });
                
                // Update file if changes were made
                if (originalContent !== patchedContent) {
                    file.content = patchedContent;
                    
                    // If this is the currently open file, update the editor
                    if (app.state.currentFile === path) {
                        const codeEditor = document.getElementById('codeEditor');
                        if (codeEditor) {
                            codeEditor.value = patchedContent;
                        }
                        updateLineNumbers();
                        highlightSyntax();
                    }
                    
                    // Track the change
                    trackChange(path, 'license-patch');
                }
            }
        }
        
        if (patchesApplied > 0) {
            showToast(`Применено ${patchesApplied} патчей лицензии`, 'success');
        } else {
            showToast('Не найдено проверок лицензии для патчинга', 'info');
        }
    };

    window.exportProject = () => {
        if (window.JSZip) {
            const zip = new JSZip();
            
            // Add all files to ZIP
            for (const [path, file] of Object.entries(app.state.project.files || {})) {
                zip.file(path, file.content);
            }
            
            // Generate ZIP and trigger download
            zip.generateAsync({type:"blob"})
                .then(function(content) {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = "smali-project.zip";
                    link.click();
                    showToast('Проект экспортирован', 'success');
                })
                .catch(function(err) {
                    console.error('Error exporting project:', err);
                    showToast('Ошибка при экспорте проекта', 'error');
                });
        } else {
            showToast('JSZip библиотека не загружена', 'error');
        }
    };

    window.showStats = () => {
        const totalFiles = Object.keys(app.state.project.files || {}).length;
        const smaliFiles = Object.keys(app.state.project.files || {}).filter(f => f.endsWith('.smali')).length;
        const totalSize = Object.values(app.state.project.files || {}).reduce((sum, f) => sum + (f.size || 0), 0);
        const totalChanges = app.state.changes.length;
        
        // Calculate LoC (Lines of Code) - just a simple count
        let totalLoc = 0;
        for (const file of Object.values(app.state.project.files || {})) {
            totalLoc += (file.content || '').split('\n').length;
        }
        
        const statsHtml = `
            <div class="p-6 max-w-md mx-auto">
                <h3 class="text-lg font-bold mb-4">Статистика проекта</h3>
                
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span>Всего файлов:</span>
                        <span class="font-bold">${totalFiles}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Smali файлов:</span>
                        <span class="font-bold">${smaliFiles}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Общий размер:</span>
                        <span class="font-bold">${formatFileSize(totalSize)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Изменений:</span>
                        <span class="font-bold">${totalChanges}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Строк кода:</span>
                        <span class="font-bold">${totalLoc}</span>
                    </div>
                    
                    ${Object.keys(app.state.dependencies).length > 0 ? `
                    <div class="pt-3 mt-3 border-t border-gray-700">
                        <div class="flex justify-between">
                            <span>Зависимостей:</span>
                            <span class="font-bold">${Object.keys(app.state.dependencies).length}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${Object.keys(app.state.methods).length > 0 ? `
                    <div class="pt-3 mt-3 border-t border-gray-700">
                        <div class="flex justify-between">
                            <span>Методов:</span>
                            <span class="font-bold">${Object.values(app.state.methods).flat().length}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button onclick="closeStatsModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Закрыть</button>
                </div>
            </div>
        `;
        
        showCustomModal('Статистика', statsHtml);
    };

    window.formatCode = () => {
        if (!app.state.currentFile) return;
        
        const codeEditor = document.getElementById('codeEditor');
        if (!codeEditor) return;
        
        const content = codeEditor.value;
        const formatted = formatSmaliCode(content);
        
        codeEditor.value = formatted;
        if (app.state.project.files && app.state.project.files[app.state.currentFile]) {
            app.state.project.files[app.state.currentFile].content = formatted;
        }
        
        updateLineNumbers();
        highlightSyntax();
        updateCursorPosition();
        
        // Track change
        trackChange(app.state.currentFile, 'format');
    };

    window.saveProject = () => {
        try {
            localStorage.setItem('smaliProject', JSON.stringify(app.state.project));
            showToast('Проект сохранен', 'success');
        } catch (e) {
            console.error('Error saving project:', e);
            showToast('Ошибка при сохранении проекта', 'error');
        }
    };

    window.switchTab = (tabName) => {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content and mark button as active
        const selectedTab = document.getElementById(`${tabName}Tab`);
        if (selectedTab) {
            selectedTab.style.display = 'flex';
            
            // Find and activate the corresponding button
            const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.dataset.tab === tabName);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            
            // Special handling for certain tabs
            if (tabName === 'methods') {
                refreshMethodsPanel();
            } else if (tabName === 'dependencies') {
                renderDependencyGraph();
            } else if (tabName === 'changes') {
                renderChangesList();
            }
        }
    };

    // Add other necessary global functions here...
}

function findAppInstance() {
    // Try to find the app instance in the global scope
    return window.app;
}

// Additional helper functions that were used in the original code
function showToast(message, type = 'info') {
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
        closeToast(toastId);
    }, 5000);
}

function closeToast(id) {
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSmaliCode(code) {
    // This is a basic formatter - in a real implementation you would want
    // a more sophisticated formatting algorithm
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

function updateLineNumbers() {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    
    if (!codeEditor || !lineNumbers) return;
    
    const lines = codeEditor.value.split('\n');
    let lineNumbersHtml = '';
    
    for (let i = 1; i <= lines.length; i++) {
        lineNumbersHtml += `<div>${i}</div>`;
    }
    
    lineNumbers.innerHTML = lineNumbersHtml;
}

function highlightSyntax() {
    const codeEditor = document.getElementById('codeEditor');
    const codeHighlight = document.getElementById('codeHighlight');
    
    if (!codeEditor || !codeHighlight) return;
    
    const code = codeEditor.value;
    const highlighted = highlightSmaliSyntax(code);
    codeHighlight.innerHTML = highlighted
        .replace(/\n/g, '<br>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
        .replace(/ /g, '&nbsp;');
}

function highlightSmaliSyntax(code) {
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

function updateCursorPosition() {
    const codeEditor = document.getElementById('codeEditor');
    const cursorPos = document.getElementById('cursorPos');
    
    if (!codeEditor || !cursorPos) return;
    
    const pos = codeEditor.selectionStart;
    const lines = codeEditor.value.substr(0, pos).split('\n');
    cursorPos.textContent = `Строка: ${lines.length}, Колонка: ${lines[lines.length-1].length + 1}`;
}

function trackChange(filePath, action) {
    const change = {
        id: Date.now(),
        filePath: filePath,
        action: action,
        timestamp: new Date(),
        content: window.app.state.project.files[filePath].content
    };
    
    window.app.state.changes.push(change);
    
    // Update changes count
    const changesList = document.getElementById('changesList');
    const changesCount = document.getElementById('changesCount');
    
    if (changesList) {
        changesList.innerHTML = renderChangesList();
    }
    if (changesCount) {
        changesCount.textContent = window.app.state.changes.length;
        changesCount.classList.toggle('hidden', window.app.state.changes.length === 0);
    }
}

function renderChangesList() {
    if (!window.app.state.changes || window.app.state.changes.length === 0) {
        return '<p class="text-gray-500 text-sm text-center py-8">Нет изменений</p>';
    }
    
    return window.app.state.changes.map(change => `
        <div class="change-item p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-750" onclick="openFile('${change.filePath}')">
            <div class="flex items-center justify-between">
                <div class="font-medium">${change.filePath.split('/').pop()}</div>
                <div class="text-xs text-gray-400">${formatTimeAgo(change.timestamp)}</div>
            </div>
            <div class="text-sm text-gray-400 mt-1">${change.filePath}</div>
        </div>
    `).join('');
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " лет";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " мес.";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " дн.";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " ч.";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " мин.";
    
    return Math.floor(seconds) + " сек.";
}

function refreshMethodsPanel() {
    const methodsContainer = document.getElementById('methodsContainer');
    if (!methodsContainer) return;
    
    if (!window.app.state.currentFile || !window.app.state.methods[window.app.state.currentFile]) {
        methodsContainer.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Нет методов для отображения</p>';
        return;
    }
    
    const methods = window.app.state.methods[window.app.state.currentFile];
    if (!methods || methods.length === 0) {
        methodsContainer.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Нет методов для отображения</p>';
        return;
    }
    
    const methodsHtml = methods.map(method => {
        const modifiersHtml = method.modifiers.map(mod => {
            const modClass = `mod-${mod}`;
            const modText = mod.charAt(0).toUpperCase();
            return `<div class="mod-icon ${modClass}" title="${mod}">${modText}</div>`;
        }).join('');
        
        return `
            <div class="method-item p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-750 flex items-start gap-3" 
                 onclick="jumpToMethod(${method.startLine})">
                <div class="flex gap-1">${modifiersHtml}</div>
                <div class="flex-1 min-w-0">
                    <div class="font-mono text-sm truncate">${method.signature}</div>
                    <div class="text-xs text-gray-400 mt-1">Строка ${method.startLine}</div>
                </div>
            </div>
        `;
    }).join('');
    
    methodsContainer.innerHTML = methodsHtml;
}

function jumpToMethod(lineNumber) {
    const codeEditor = document.getElementById('codeEditor');
    if (!codeEditor) return;
    
    // Calculate position based on line number
    const lines = codeEditor.value.split('\n');
    let position = 0;
    
    for (let i = 0; i < lineNumber - 1; i++) {
        if (i < lines.length) {
            position += lines[i].length + 1; // +1 for newline character
        }
    }
    
    // Set cursor position
    codeEditor.focus();
    codeEditor.setSelectionRange(position, position);
    
    // Scroll to position
    codeEditor.scrollTop = (lineNumber - 1) * 22; // Approximate line height
    
    updateCursorPosition();
}

function renderDependencyGraph() {
    const dependencyGraph = document.getElementById('dependencyGraph');
    if (!dependencyGraph) return;
    
    // Clear the graph container
    dependencyGraph.innerHTML = '';
    
    // If no dependencies, show message
    if (!window.app.state.dependencies || Object.keys(window.app.state.dependencies).length === 0) {
        dependencyGraph.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Нет зависимостей для отображения</div>';
        return;
    }
    
    // Build graph structure
    buildLocalGraph();
}

function buildLocalGraph() {
    // This is a simplified visualization - in a real implementation
    // you would use a proper graph visualization library
    const nodes = [];
    const edges = [];
    
    // Create nodes for each file
    for (const [filePath, deps] of Object.entries(window.app.state.dependencies)) {
        nodes.push({
            id: filePath,
            label: filePath.split('/').pop(),
            refs: deps.references.length
        });
        
        // Create edges for dependencies
        for (const ref of deps.references) {
            // Find if any loaded file matches this reference
            for (const otherPath of Object.keys(window.app.state.project.files)) {
                // Simple check if the file path contains the reference
                if (otherPath.includes(ref.replace(/[;\\/]/g, '_').replace('L', ''))) {
                    edges.push({
                        source: filePath,
                        target: otherPath
                    });
                }
            }
        }
    }
    
    // Store in state
    window.app.state.graph.nodes = nodes;
    window.app.state.graph.edges = edges;
    
    // Render the graph visualization
    drawGraphVisualization();
}

function drawGraphVisualization() {
    const dependencyGraph = document.getElementById('dependencyGraph');
    if (!dependencyGraph) return;
    
    // Clear the graph container
    dependencyGraph.innerHTML = '';
    
    // Create a simple visualization using SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${dependencyGraph.clientWidth} ${dependencyGraph.clientHeight}`);
    
    // Draw edges (dependencies)
    for (const edge of window.app.state.graph.edges) {
        const sourceNode = window.app.state.graph.nodes.find(n => n.id === edge.source);
        const targetNode = window.app.state.graph.nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", "50");
            line.setAttribute("y1", (window.app.state.graph.nodes.indexOf(sourceNode) + 1) * 60);
            line.setAttribute("x2", "300");
            line.setAttribute("y2", (window.app.state.graph.nodes.indexOf(targetNode) + 1) * 60);
            line.setAttribute("stroke", "#6b7280");
            line.setAttribute("stroke-width", "1");
            svg.appendChild(line);
        }
    }
    
    // Draw nodes (files)
    window.app.state.graph.nodes.forEach((node, idx) => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", (idx + 1) * 60);
        circle.setAttribute("r", "20");
        circle.setAttribute("fill", "#3b82f6");
        svg.appendChild(circle);
        
        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", "50");
        text.setAttribute("y", (idx + 1) * 60 + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("font-size", "12");
        text.textContent = node.label.substring(0, 8) + (node.label.length > 8 ? "..." : "");
        svg.appendChild(text);
    });
    
    dependencyGraph.appendChild(svg);
}

function showCustomModal(title, content) {
    // Remove any existing modals
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div class="bg-gray-750 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 class="text-lg font-bold">${title}</h3>
                    <button onclick="closeStatsModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div class="flex-1 overflow-auto p-6">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeStatsModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function zoomIn() { 
    if (window.app.state) {
        window.app.state.zoom *= 1.2; 
        requestRender(); 
    }
}

function zoomOut() { 
    if (window.app.state) {
        window.app.state.zoom /= 1.2; 
        requestRender(); 
    }
}

function resetView() { 
    if (window.app.state) {
        window.app.state.zoom = 1; 
        window.app.state.panX = 0; 
        window.app.state.panY = 0; 
        requestRender(); 
    }
}

function autoLayout() { 
    buildLocalGraph(); 
}

function requestRender() {
    // In a real implementation, this would update the graph visualization
    // with the current pan and zoom values
    drawGraphVisualization();
}