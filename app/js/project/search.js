import { debounce } from '../shared/utils.js';
import { renderFileTree } from './file-tree.js';
import { DOM, state } from '../core/state.js';
import { openFile } from '../editor/editor.js';

        function initSearch() {
            DOM.searchFiles.addEventListener('input', debounce((e) => {
                state.searchQuery = e.target.value.toLowerCase();
                renderFileTree();
            }, 150));
        }

        function renderSearchResults() {
            const query = state.searchQuery.toLowerCase();
            const parts = ['<div class="p-2 text-xs text-gray-400 uppercase font-bold">Результаты</div>'];
            let count = 0;

            // Use a more efficient search algorithm for large datasets
            const fileEntries = Array.from(state.files.entries());
            
            for (let i = 0; i < fileEntries.length && count < 100; i += 10) {
                // Process in small batches to maintain UI responsiveness
                const batch = fileEntries.slice(i, i + 10);
                for (const [path] of batch) {
                    if (path.toLowerCase().includes(query)) {
                        const fileName = path.split('/').pop();
                        const safePath = path.replace(/"/g, '&quot;');
                        parts.push(`
                            <div class="file-tree-item px-2 py-1 cursor-pointer rounded text-sm truncate"
                                 onclick="openFile('${safePath}')" data-path="${safePath}" title="${path}">
                                <span class="text-yellow-400">📄</span> ${fileName}
                            </div>
                        `);
                        count++;
                        if (count >= 100) break;
                    }
                }
            }
            
            DOM.fileTree.innerHTML = parts.join('');
        }

export { initSearch, renderSearchResults };
