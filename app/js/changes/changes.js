import { DOM, state } from '../core/state.js';
import { renderFileTree } from '../project/file-tree.js';
import { reindexFileMethods, syncEditorGeometry, updateLineNumbers } from '../editor/editor.js';
import { showToast } from '../ui/toast.js';

        function revertAllChanges() {
            if (state.fileChanges.size === 0) {
                showToast('Нет изменений для отмены', 'info');
                return;
            }
            
            for (const [path, changes] of state.fileChanges) {
                const fileData = state.files.get(path);
                if (!fileData) continue;
                
                for (let i = changes.length - 1; i >= 0; i--) {
                    const change = changes[i];
                    fileData.content = fileData.content.replace(change.newCode, change.oldCode);
                }
                
                fileData.modified = fileData.content !== fileData.original;
                reindexFileMethods(path);
            }
            
            state.fileChanges.clear();
            state.selectedChangeFile = null;
            
            if (state.currentFile) {
                const fileData = state.files.get(state.currentFile);
                if (fileData) {
                    DOM.codeEditor.value = fileData.content;
                    syncEditorGeometry();
                    updateLineNumbers();
                    updateSyntaxHighlight();
                }
            }
            
            DOM.diffFileName.textContent = 'Выберите файл для просмотра изменений';
            DOM.revertFileBtn.classList.add('hidden');
            DOM.fileDiffView.innerHTML = '<p class="text-gray-500 text-center py-8">Выберите файл из списка слева</p>';
            
            updateChangesTab();
            renderFileTree();
            
            showToast('Все изменения отменены', 'success');
        }

        function revertSelectedFile() {
            if (!state.selectedChangeFile) return;
            
            const fileData = state.files.get(state.selectedChangeFile);
            if (!fileData) return;
            
            const changes = state.fileChanges.get(state.selectedChangeFile) || [];
            
            // Revert all changes in reverse order
            for (let i = changes.length - 1; i >= 0; i--) {
                const change = changes[i];
                fileData.content = fileData.content.replace(change.newCode, change.oldCode);
            }
            
            fileData.modified = fileData.content !== fileData.original;
            state.fileChanges.delete(state.selectedChangeFile);
            
            if (state.currentFile === state.selectedChangeFile) {
                DOM.codeEditor.value = fileData.content;
                syncEditorGeometry();
                updateLineNumbers();
                updateSyntaxHighlight();
            }
            
            reindexFileMethods(state.selectedChangeFile);
            
            state.selectedChangeFile = null;
            DOM.diffFileName.textContent = 'Выберите файл для просмотра изменений';
            DOM.revertFileBtn.classList.add('hidden');
            DOM.fileDiffView.innerHTML = '<p class="text-gray-500 text-center py-8">Выберите файл из списка слева</p>';
            
            updateChangesTab();
            renderFileTree();
            
            showToast('Изменения в файле отменены', 'success');
        }

        function selectChangeFile(path) {
            state.selectedChangeFile = path;
            updateChangesTab();
            
            const changes = state.fileChanges.get(path) || [];
            DOM.diffFileName.textContent = path.split('/').pop();
            DOM.revertFileBtn.classList.remove('hidden');
            
            if (changes.length === 0) {
                DOM.fileDiffView.innerHTML = '<p class="text-gray-500 text-center py-8">Нет изменений</p>';
                return;
            }
            
            const parts = changes.map((change, idx) => `
                <div class="mb-6 border border-gray-700 rounded-lg overflow-hidden">
                    <div class="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                        <span class="font-medium text-blue-400">${change.methodName}</span>
                        <span class="text-xs text-gray-500">${new Date(change.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="p-3">
                        <div class="text-xs text-red-400 font-bold mb-2">− Оригинал</div>
                        <div class="diff-removed p-2 rounded mb-4 overflow-x-auto"><pre class="whitespace-pre">${highlightSmali(change.oldCode)}</pre></div>
                        <div class="text-xs text-green-400 font-bold mb-2">+ Новый код</div>
                        <div class="diff-added p-2 rounded overflow-x-auto"><pre class="whitespace-pre">${highlightSmali(change.newCode)}</pre></div>
                    </div>
                </div>
            `);
            
            DOM.fileDiffView.innerHTML = parts.join('');
        }

        function updateChangesTab() {
            const changedFiles = Array.from(state.fileChanges.entries()).filter(([_, changes]) => changes.length > 0);
            
            DOM.changesCount.textContent = changedFiles.length;
            DOM.changesCount.classList.toggle('hidden', changedFiles.length === 0);
            DOM.totalChanges.textContent = `${changedFiles.length} файлов`;
            
            if (changedFiles.length === 0) {
                DOM.changesList.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Нет изменений</p>';
                return;
            }
            
            // For large numbers of changed files, implement virtual scrolling or pagination
            const MAX_DISPLAY = 100;
            const displayFiles = changedFiles.slice(0, MAX_DISPLAY);
            
            const parts = displayFiles.map(([path, changes]) => {
                const fileName = path.split('/').pop();
                const isSelected = state.selectedChangeFile === path;
                return `
                    <div class="change-item p-3 cursor-pointer ${isSelected ? 'selected' : ''}" onclick="selectChangeFile('${path.replace(/'/g, "\\'")}')">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-sm truncate" title="${path}">${fileName}</span>
                            <span class="text-xs text-blue-400">${changes.length} изм.</span>
                        </div>
                        <div class="text-xs text-gray-500 mt-1 truncate">${path}</div>
                    </div>
                `;
            });
            
            if (changedFiles.length > MAX_DISPLAY) {
                parts.push(`<div class="p-3 text-center text-sm text-gray-500">Показано ${MAX_DISPLAY} из ${changedFiles.length} файлов</div>`);
            }
            
            DOM.changesList.innerHTML = parts.join('');
        }

export { updateChangesTab, selectChangeFile, revertSelectedFile, revertAllChanges };
