import { updateLoading } from '../ui/loading.js';
import { extractClassInfo, extractClassName, formatSmaliType, getModIcons, parseSmaliArgs } from '../core/smali-parser.js';
import { DOM, state } from '../core/state.js';
import { generateStubCode, updateStubOptions } from '../editor/stubs.js';
import { debounce } from '../shared/utils.js';
import { applyStub } from '../editor/editor.js';

        function buildMethodsIndex() {
            state.methodsIndex = new Map();
            state.methods.forEach((m, idx) => {
                const key = m.nameLower.substring(0, 2);
                if (!state.methodsIndex.has(key)) {
                    state.methodsIndex.set(key, []);
                }
                state.methodsIndex.get(key).push(idx);
            });
        }

        function getMethodCode(method) {
            const fileData = state.files.get(method.file);
            if (!fileData) return null;
            
            const lines = fileData.content.split('\n');
            let startLine = method.line - 1;
            let endLine = startLine;
            
            for (let i = startLine; i < lines.length; i++) {
                if (lines[i].trim() === '.end method') {
                    endLine = i;
                    break;
                }
            }
            
            return lines.slice(startLine, endLine + 1).join('\n');
        }

        function getMethodCodeByLine(filePath, startLine) {
            const fileData = state.files.get(filePath);
            if (!fileData) return null;
            
            const lines = fileData.content.split('\n');
            let endLine = startLine - 1;
            
            // Look for the end of the method starting from the given line
            for (let i = startLine - 1; i < lines.length; i++) {
                if (lines[i].trim() === '.end method') {
                    endLine = i;
                    break;
                }
            }
            
            // Make sure we found a valid end method
            if (endLine >= startLine - 1) {
                return lines.slice(startLine - 1, endLine + 1).join('\n');
            }
            return null;
        }

        async function indexClasses() {
            const entries = Array.from(state.files.entries());
            const total = entries.length;
            const CHUNK_SIZE = 200;
            
            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = entries.slice(i, i + CHUNK_SIZE);
                await new Promise(r => setTimeout(r, 0));
                
                chunk.forEach(([path, fileData]) => {
                    if (!path.endsWith('.smali')) return;
                    const className = extractClassName(fileData.content);
                    if (className) {
                        const info = extractClassInfo(fileData.content);
                        state.classMap.set(className, { path, ...info });
                    }
                });
                updateLoading(30 + (i / total) * 30, 'Индексация классов...', Math.min(i + CHUNK_SIZE, total), total);
            }
        }

        async function indexMethods() {
            state.methods = [];
            const entries = Array.from(state.files.entries());
            const total = entries.length;
            const CHUNK_SIZE = 50; // Reduced chunk size for better responsiveness

            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = entries.slice(i, i + CHUNK_SIZE);
                
                // Process this chunk
                for (const [path, fileData] of chunk) {
                    if (!path.endsWith('.smali') || !fileData.content) continue;
                    
                    // For very large files, use a more efficient approach
                    if (fileData.content.length > 1000000) { // 1MB threshold
                        // For very large files, only index methods in smaller chunks
                        const lines = fileData.content.split('\n');
                        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                            // Yield to event loop periodically for large files
                            if (lineIdx % 5000 === 0) {
                                await new Promise(resolve => setImmediate(resolve));
                            }
                            
                            const line = lines[lineIdx];
                            const match = line.match(/^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/);
                            if (match) {
                                state.methods.push({
                                    file: path,
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
                    } else {
                        // For normal files, use the standard approach
                        const lines = fileData.content.split('\n');
                        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                            const line = lines[lineIdx];
                            const match = line.match(/^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/);
                            if (match) {
                                state.methods.push({
                                    file: path,
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
                    }
                }

                // Yield to event loop between chunks to prevent blocking
                await new Promise(resolve => setImmediate(resolve));
                
                updateLoading(60 + (i / total) * 40, 'Индексация методов...', Math.min(i + CHUNK_SIZE, total), total);
            }

            buildMethodsIndex();
        }

        function initMethodControls() {
            DOM.methodSearch.addEventListener('input', debounce(renderMethodList, 150));
            
            DOM.customValue.addEventListener('input', debounce(() => {
                updateStubPreview();
                updateDiffPreview();
            }, 100));
            
            DOM.stubValue.addEventListener('change', function() {
                const showCustom = this.value === 'custom';
                DOM.customValueContainer.classList.toggle('hidden', !showCustom);
                updateStubPreview();
                updateDiffPreview();
            });
            
            document.getElementById('applyStubBtn').onclick = applyStub;
        }

        function renderListItems(container, methods, showFile) {
            const parts = methods.map((m) => {
                const globalIdx = state.methods.indexOf(m);
                const retType = formatSmaliType(m.returnType);
                return `
                <div class="method-item p-2.5 border-b border-gray-700 cursor-pointer ${state.selectedMethod === globalIdx ? 'selected' : ''}" onclick="selectMethod(${globalIdx})">
                    <div class="flex items-center gap-1 flex-wrap">${getModIcons(m.modifiers)}</div>
                    <div class="font-medium text-sm text-blue-400 truncate mt-1" title="${m.name}">${m.name === '<init>' ? '● constructor' : (m.name === '<clinit>' ? '◆ static init' : m.name)}</div>
                    <div class="text-xs text-gray-500 mt-0.5 font-mono">(${parseSmaliArgs(m.params).join(', ') || ''}) → ${retType}</div>
                    ${showFile ? `<div class="text-[10px] text-gray-400 mt-1 truncate">${m.file.split('/').pop()}</div>` : ''}
                </div>`;
            });
            container.innerHTML = parts.join('');
        }

        function renderMethodList() {
            const search = DOM.methodSearch.value.toLowerCase().trim();
            
            if (state.methodSearchScope === 'project') {
                if (search.length < 2) {
                    DOM.methodList.innerHTML = `<div class="flex flex-col items-center justify-center h-40 text-gray-500 text-sm p-4 text-center select-none">
                        <span class="text-2xl mb-2 opacity-50">🔍</span><p>Введите минимум 2 символа</p>
                    </div>`;
                    return;
                }
                
                let filtered = [];
                const searchKey = search.substring(0, 2);
                
                if (state.methodsIndex?.has(searchKey)) {
                    const indices = state.methodsIndex.get(searchKey);
                    // Limit results to prevent UI blocking
                    for (const idx of indices.slice(0, 100)) {
                        if (filtered.length >= 50) break;
                        const m = state.methods[idx];
                        if (m.nameLower.includes(search)) filtered.push(m);
                    }
                }
                
                if (filtered.length === 0) {
                    DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Ничего не найдено</p>';
                    return;
                }
                renderListItems(DOM.methodList, filtered, true);
                return;
            }
            
            if (!state.currentFile) {
                DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Выберите файл</p>';
                return;
            }
            
            const fileMethods = state.methods.filter(m => m.file === state.currentFile);
            if (fileMethods.length === 0) {
                DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Нет методов</p>';
                return;
            }
            
            const filtered = search ? fileMethods.filter(m => m.nameLower.includes(search)) : fileMethods;
            if (filtered.length === 0) {
                DOM.methodList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Не найдено</p>';
                return;
            }
            renderListItems(DOM.methodList, filtered, false);
        }

        function selectMethod(idx) {
            state.selectedMethod = idx;
            const m = state.methods[idx];
            
            DOM.selectedMethodInfo.innerHTML = `
                <div class="font-medium text-blue-400">${m.name === '<init>' ? 'constructor' : m.name}</div>
                <div class="text-xs text-gray-400 mt-1">${m.file.split('/').pop()} : строка ${m.line}</div>
            `;
            DOM.returnType.textContent = formatSmaliType(m.returnType) + ` (${m.returnType})`;
            DOM.stubConfig.classList.remove('hidden');
            DOM.stubPlaceholder.classList.add('hidden');
            
            updateStubOptions(m.returnType);
            updateStubPreview();
            updateDiffPreview();
            updateCurrentCodePreview(m);
            renderMethodList();
        }

        function setMethodScope(scope) {
            state.methodSearchScope = scope;
            document.getElementById('scopeFileBtn').className = scope === 'file' 
                ? 'px-2 py-0.5 text-xs rounded bg-blue-600 text-white transition' 
                : 'px-2 py-0.5 text-xs rounded text-gray-400 hover:text-white transition';
            document.getElementById('scopeProjectBtn').className = scope === 'project' 
                ? 'px-2 py-0.5 text-xs rounded bg-blue-600 text-white transition' 
                : 'px-2 py-0.5 text-xs rounded text-gray-400 hover:text-white transition';
            renderMethodList();
        }

        function updateCurrentCodePreview(m) {
            const code = getMethodCode(m);
            DOM.currentMethodCode.innerHTML = `<div class="text-xs text-gray-400 mb-2">Текущий код:</div><pre class="whitespace-pre">${highlightSmali(code || 'Не найден')}</pre>`;
        }

        function updateDiffPreview() {
            const m = state.methods[state.selectedMethod];
            if (!m) return;
            const oldCode = getMethodCode(m);
            const newCode = generateStubCode(m);
            
            DOM.diffPreview.innerHTML = `
                <div class="mb-4"><div class="text-xs text-red-400 font-bold mb-2">− Оригинал</div>
                    <div class="diff-removed p-2 rounded overflow-x-auto"><pre class="whitespace-pre">${highlightSmali(oldCode || 'Не найден')}</pre></div>
                </div>
                <div><div class="text-xs text-green-400 font-bold mb-2">+ Stub</div>
                    <div class="diff-added p-2 rounded overflow-x-auto"><pre class="whitespace-pre">${highlightSmali(newCode)}</pre></div>
                </div>`;
        }

        function updateStubPreview() { 
            const m = state.methods[state.selectedMethod];
            if (m) DOM.stubPreview.innerHTML = highlightSmali(generateStubCode(m));
        }

export { indexClasses, indexMethods, buildMethodsIndex, getMethodCode, getMethodCodeByLine, setMethodScope, renderMethodList, renderListItems, selectMethod, updateStubPreview, updateDiffPreview, updateCurrentCodePreview, initMethodControls };
