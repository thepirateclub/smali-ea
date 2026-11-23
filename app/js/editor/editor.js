import { debounce, throttle } from '../shared/utils.js';
import { renderFileTree } from '../project/file-tree.js';
import { saveCurrentFile } from '../project/file-io.js';
import { DOM, LINE_HEIGHT, state } from '../core/state.js';
import { buildMethodsIndex, getMethodCode, renderMethodList, updateCurrentCodePreview, updateDiffPreview } from '../analysis/methods.js';
import { generateStubCode } from './stubs.js';
import { updateChangesTab } from '../changes/changes.js';
import { showToast } from '../ui/toast.js';
import { buildLocalGraph } from '../analysis/dependency-graph.js';
import { formatSmaliType, getModIcons, parseSmaliArgs } from '../core/smali-parser.js';

        function applyStub() {
            if (state.selectedMethod === null) {
                showToast('Выберите метод', 'warning');
                return;
            }
            
            const methodMeta = state.methods[state.selectedMethod];
            const fileData = state.files.get(methodMeta.file);
            if (!fileData) {
                showToast('Файл не найден', 'error');
                return;
            }
            
            const originalCode = getMethodCode(methodMeta);
            if (!originalCode) {
                showToast('Метод не найден в файле', 'error');
                return;
            }

            const stubCode = generateStubCode(methodMeta);
            
            // Track change
            if (!state.fileChanges.has(methodMeta.file)) {
                state.fileChanges.set(methodMeta.file, []);
            }
            state.fileChanges.get(methodMeta.file).push({
                methodName: methodMeta.name,
                oldCode: originalCode,
                newCode: stubCode,
                timestamp: Date.now()
            });
            
            // Apply change
            fileData.content = fileData.content.replace(originalCode, stubCode);
            fileData.modified = true;
            
            state.changeHistory.push({
                time: new Date().toLocaleTimeString(),
                file: methodMeta.file,
                method: methodMeta.name,
                action: 'stub'
            });
            
            updateChangesTab();
            updateDiffPreview();
            updateCurrentCodePreview(methodMeta);
            renderFileTree();
            
            if (state.currentFile === methodMeta.file) {
                DOM.codeEditor.value = fileData.content;
                syncEditorGeometry();
                updateLineNumbers();
                updateSyntaxHighlight();
            }
            
            // Re-index methods for this file
            reindexFileMethods(methodMeta.file);
            
            showToast('Метод заменён на stub', 'success');
        }

        function formatCode() { 
            if (!state.currentFile) { showToast('Откройте файл', 'warning'); return; }
            
            const lines = DOM.codeEditor.value.split('\n');
            const formatted = [];
            let indent = 0;
            
            for (let line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('.end ')) indent = Math.max(0, indent - 1);
                
                if (trimmed.length > 0) {
                    if (trimmed.startsWith('.') || trimmed.startsWith(':')) formatted.push('    '.repeat(indent) + trimmed);
                    else if (trimmed.startsWith('#')) formatted.push('    '.repeat(indent) + trimmed);
                    else formatted.push('    '.repeat(indent + 1) + trimmed);
                } else formatted.push('');
                
                if (trimmed.startsWith('.method ') || trimmed.startsWith('.annotation ')) indent++;
            }
            
            DOM.codeEditor.value = formatted.join('\n');
            
            if (state.currentFile) {
                const fileData = state.files.get(state.currentFile);
                fileData.content = DOM.codeEditor.value;
                fileData.modified = fileData.content !== fileData.original;
            }
            
            syncEditorGeometry();
            updateLineNumbers();
            updateSyntaxHighlight();
            showToast('Код отформатирован', 'success');
        }

        function initEditor() {
            const debouncedHighlight = debounce(updateSyntaxHighlight, 50);
            const debouncedStructure = debounce(updateFileStructure, 300);
            
            // Use a more efficient approach for large files
            let isUpdating = false;
            
            DOM.codeEditor.addEventListener('input', () => {
                if (isUpdating) return; // Prevent re-entrancy
                
                if (state.currentFile) {
                    const fileData = state.files.get(state.currentFile);
                    fileData.content = DOM.codeEditor.value;
                    fileData.modified = fileData.content !== fileData.original;
                    renderFileTree();
                }
                
                // Optimize for large files
                const isLargeFile = DOM.codeEditor.value.length > 100000; // 100KB threshold
                if (isLargeFile) {
                    // For large files, update less frequently
                    if (!isUpdating) {
                        isUpdating = true;
                        requestAnimationFrame(() => {
                            syncEditorGeometry();
                            updateLineNumbers();
                            debouncedHighlight();
                            debouncedStructure();
                            isUpdating = false;
                        });
                    }
                } else {
                    // For smaller files, update immediately
                    syncEditorGeometry();
                    updateLineNumbers();
                    debouncedHighlight();
                    debouncedStructure();
                }
            });

            const throttledScroll = throttle(() => {
                DOM.lineNumbers.scrollTop = DOM.codeArea.scrollTop;
            }, 16);
            
            DOM.codeArea.addEventListener('scroll', throttledScroll);

            DOM.codeEditor.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '    ');
                    return;
                }
                
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    saveCurrentFile();
                }
            });
            
            // Improved selection handling to prevent conflicts with drag operations
            let isMouseDown = false;
            let isDragging = false;
            let dragStartX = 0;
            let dragStartY = 0;
            
            DOM.codeEditor.addEventListener('mousedown', (e) => {
                isMouseDown = true;
                isDragging = false;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                
                // Allow normal selection behavior
                updateCursorPosition();
            });
            
            DOM.codeEditor.addEventListener('mousemove', (e) => {
                if (isMouseDown) {
                    const deltaX = Math.abs(e.clientX - dragStartX);
                    const deltaY = Math.abs(e.clientY - dragStartY);
                    if (deltaX > 5 || deltaY > 5) {
                        isDragging = true;
                    }
                }
            });
            
            DOM.codeEditor.addEventListener('mouseup', (e) => {
                if (isMouseDown && !isDragging) {
                    // Single click - update cursor position
                    updateCursorPosition();
                }
                isMouseDown = false;
                isDragging = false;
            });
            
            DOM.codeEditor.addEventListener('click', updateCursorPosition);
            DOM.codeEditor.addEventListener('keyup', throttle(updateCursorPosition, 50));
            
            // Handle selection changes separately to avoid conflicts
            DOM.codeEditor.addEventListener('select', throttle(updateCursorPosition, 50));
        }

        async function openFile(path) {
            const prev = DOM.fileTree.querySelector('.file-tree-item.active');
            if (prev) prev.classList.remove('active');
            
            const next = DOM.fileTree.querySelector(`[data-path="${CSS.escape(path)}"]`);
            if (next) next.classList.add('active');
            
            state.currentFile = path;
            const fileData = state.files.get(path);
            if (!fileData) return;
            
            DOM.codeEditor.value = fileData.content;
            DOM.codeArea.scrollTop = 0;
            DOM.codeArea.scrollLeft = 0;
            
            DOM.currentFile.textContent = path;
            
            syncEditorGeometry();
            updateLineNumbers();
            updateSyntaxHighlight();
            
            requestAnimationFrame(() => updateFileStructure());
            
            if (state.methodSearchScope === 'file') {
                renderMethodList();
            }
            
            if (!document.getElementById('dependenciesTab').classList.contains('hidden')) {
                buildLocalGraph();
            }
        }

        function reindexFileMethods(filePath) {
            const fileData = state.files.get(filePath);
            if (!fileData) return;
            
            // Remove old methods for this file
            state.methods = state.methods.filter(m => m.file !== filePath);
            
            // Re-index
            const lines = fileData.content.split('\n');
            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                const line = lines[lineIdx];
                const match = line.match(/^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/);
                if (match) {
                    state.methods.push({
                        file: filePath,
                        name: match[2],
                        nameLower: match[2].toLowerCase(),
                        modifiers: match[1].trim(),
                        params: match[3],
                        returnType: match[4],
                        fullSignature: `${match[2]}(${match[3]})${match[4]}`,
                        line: lineIdx + 1
                    });
                }
            }
            
            buildMethodsIndex();
            renderMethodList();
        }

        function scrollToLine(line) {
            DOM.codeArea.scrollTop = (line - 1) * LINE_HEIGHT;
        }

        function syncEditorGeometry() {
            const lines = DOM.codeEditor.value.split('\n');
            const lineCount = lines.length;
            const height = lineCount * LINE_HEIGHT;
            
            DOM.codeWrapper.style.height = height + 'px';
            DOM.codeEditor.style.height = height + 'px';
            
            let maxWidth = 0;
            lines.forEach(line => {
                maxWidth = Math.max(maxWidth, line.length);
            });
            const width = Math.max(maxWidth * 7.8 + 50, DOM.codeArea.clientWidth);
            DOM.codeWrapper.style.width = width + 'px';
            DOM.codeEditor.style.width = width + 'px';
        }

        function updateCursorPosition() {
            const pos = DOM.codeEditor.selectionStart;
            const lines = DOM.codeEditor.value.substr(0, pos).split('\n');
            DOM.cursorPos.textContent = `Строка: ${lines.length}, Колонка: ${lines[lines.length-1].length + 1}`;
        }

        function updateFileStructure() { 
            if (!state.currentFile) return;
            const content = DOM.codeEditor.value;
            const contentLines = content.split('\n');
            
            const classMatch = content.match(/^\.class\s+([\w\s]+)?(L[\w\/$]+;)/m);
            const classNameFull = classMatch ? classMatch[2] : 'N/A';
            const classNameShort = formatSmaliType(classNameFull);
            const classMods = classMatch ? classMatch[1]?.trim() : '';
            
            const superMatch = content.match(/^\.super\s+(L[\w\/$]+;)/m);
            const sourceMatch = content.match(/^\.source\s+"([^"]+)"/m);
            
            const implementsRegex = /^\.implements\s+(L[\w\/$]+;)/gm;
            const implementsMatches = [...content.matchAll(implementsRegex)];
            const lines = contentLines.length;
            const size = (content.length / 1024).toFixed(2);
            
            let infoHtml = `
                <div class="mb-2"><span class="text-gray-400 block text-[10px] uppercase">Класс</span>
                    <span class="text-blue-300 break-all font-mono font-bold text-sm">${classNameShort}</span>
                    ${classMods ? `<div class="mt-1">${getModIcons(classMods)}</div>` : ''}
                </div>
                <div class="mb-2"><span class="text-gray-400 block text-[10px] uppercase">Исходник</span>
                    <span class="text-yellow-300 font-mono text-xs">${sourceMatch ? sourceMatch[1] : 'N/A'}</span></div>
                <div class="mb-2"><span class="text-gray-400 block text-[10px] uppercase">Родитель</span>
                    <span class="text-purple-300 font-mono text-xs">${superMatch ? formatSmaliType(superMatch[1]) : 'Object'}</span></div>
            `;
            
            if (implementsMatches.length > 0) {
                infoHtml += `<div class="mb-2"><span class="text-gray-400 block text-[10px] uppercase">Интерфейсы</span><div class="flex flex-wrap gap-1 mt-1">
                    ${implementsMatches.map(m => `<span class="px-1.5 py-0.5 rounded bg-gray-700 text-green-300 text-[10px] font-mono">${formatSmaliType(m[1])}</span>`).join('')}</div></div>`;
            }
            
            infoHtml += `<div class="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-700 text-xs">
                <div><span class="text-gray-500">Строк:</span> <span class="text-gray-200">${lines}</span></div>
                <div><span class="text-gray-500">Размер:</span> <span class="text-gray-200">${size} KB</span></div>
            </div>`;
            DOM.fileInfo.innerHTML = infoHtml;

            const structParts = [];
            
            const fields = [];
            contentLines.forEach((line, idx) => {
                const fm = line.match(/^\.field\s+([\w\s-]+)\s+([\w$]+):([\w\/$\[;]+)/);
                if (fm) fields.push({ mods: fm[1].trim(), name: fm[2], type: fm[3], line: idx + 1 });
            });
            
            if (fields.length > 0) {
                structParts.push(`<div class="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase mt-1 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">📦 Поля (${fields.length})</div>`);
                fields.forEach(f => {
                    structParts.push(`<div class="structure-item px-2 py-1 cursor-pointer rounded flex items-center gap-2" onclick="scrollToLine(${f.line})">
                        <div class="flex-shrink-0">${getModIcons(f.mods)}</div>
                        <span class="text-xs font-mono text-blue-200 truncate">${f.name}</span>
                        <span class="text-[10px] text-gray-500 font-mono truncate ml-auto">: ${formatSmaliType(f.type)}</span>
                    </div>`);
                });
            }
            
            const methods = [];
            contentLines.forEach((line, idx) => {
                const mm = line.match(/^\.method\s+([\w\s-]+)\s+([<\w$>]+)\(([^)]*)\)([\w\/$\[;]+)/);
                if (mm) methods.push({ mods: mm[1].trim(), name: mm[2], args: mm[3], ret: mm[4], line: idx + 1 });
            });
            
            const constructors = methods.filter(m => m.name === '<init>' || m.name === '<clinit>');
            const regularMethods = methods.filter(m => m.name !== '<init>' && m.name !== '<clinit>');
            
            if (constructors.length > 0) {
                structParts.push(`<div class="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase mt-2 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">● Конструкторы (${constructors.length})</div>`);
                constructors.forEach(m => {
                    const argsFormatted = parseSmaliArgs(m.args).join(', ') || 'void';
                    const name = m.name === '<clinit>' ? '◆ static {}' : '● constructor';
                    structParts.push(`<div class="structure-item px-2 py-1 cursor-pointer rounded" onclick="scrollToLine(${m.line})">
                        <div class="flex items-center gap-1 flex-wrap">${getModIcons(m.mods)}</div>
                        <div class="text-xs font-mono text-yellow-400 font-bold mt-1">${name}</div>
                        <div class="text-[10px] text-gray-500 font-mono truncate">(${argsFormatted})</div>
                    </div>`);
                });
            }
            
            if (regularMethods.length > 0) {
                structParts.push(`<div class="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase mt-2 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">⚙️ Методы (${regularMethods.length})</div>`);
                regularMethods.forEach(m => {
                    const argsFormatted = parseSmaliArgs(m.args).join(', ') || 'void';
                    const retType = formatSmaliType(m.ret);
                    structParts.push(`<div class="structure-item px-2 py-1 cursor-pointer rounded" onclick="scrollToLine(${m.line})">
                        <div class="flex items-center gap-1 flex-wrap">${getModIcons(m.mods)}</div>
                        <div class="text-xs font-mono text-purple-300 font-medium mt-1 truncate">${m.name}</div>
                        <div class="text-[10px] text-gray-500 font-mono truncate">(${argsFormatted}) → ${retType}</div>
                    </div>`);
                });
            }
            
            if (fields.length === 0 && methods.length === 0) {
                structParts.push('<div class="text-gray-500 text-xs text-center py-4">Пустой класс</div>');
            }
            
            DOM.fileStructure.innerHTML = structParts.join('');
        }

        function updateLineNumbers() {
            const lines = DOM.codeEditor.value.split('\n').length;
            if (lines !== state.lastLineCount) {
                // For large files, use document fragment for better performance
                const isLargeFile = lines > 1000;
                if (isLargeFile) {
                    const fragment = document.createDocumentFragment();
                    for (let i = 1; i <= lines; i++) {
                        const div = document.createElement('div');
                        div.textContent = i;
                        fragment.appendChild(div);
                    }
                    DOM.lineNumbers.innerHTML = '';
                    DOM.lineNumbers.appendChild(fragment);
                } else {
                    // For smaller files, use the simple approach
                    const parts = [];
                    for (let i = 1; i <= lines; i++) parts.push(`<div>${i}</div>`);
                    DOM.lineNumbers.innerHTML = parts.join('');
                }
                state.lastLineCount = lines;
            }
            DOM.fileSize.textContent = DOM.codeEditor.value.length + ' байт';
        }

export { initEditor, syncEditorGeometry, applyStub, reindexFileMethods, updateLineNumbers, scrollToLine, formatCode, updateCursorPosition, openFile, updateFileStructure };
