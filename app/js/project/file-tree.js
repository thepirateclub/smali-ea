import { DOM, state } from '../core/state.js';
import { renderSearchResults } from './search.js';
import { openFile } from '../editor/editor.js';

        function buildTree() {
            const tree = {};
            for (const path of state.files.keys()) {
                const parts = path.split('/');
                let current = tree;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (i === parts.length - 1) {
                        current[part] = { _isFile: true, _path: path };
                    } else {
                        current[part] = current[part] || {};
                        current = current[part];
                    }
                }
            }
            return tree;
        }

        function renderFileTree() {
            if (state.searchQuery) {
                renderSearchResults();
                return;
            }
            const tree = buildTree();
            DOM.fileTree.innerHTML = renderTreeNode(tree, 0, '');
        }

        function renderTreeNode(node, indent, currentPath) {
            const parts = [];
            const entries = Object.entries(node).sort((a, b) => {
                const aIsFile = a[1]._isFile;
                const bIsFile = b[1]._isFile;
                if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
                return a[0].localeCompare(b[0]);
            });

            for (const [name, value] of entries) {
                if (value._isFile) {
                    const safePath = value._path.replace(/"/g, '&quot;');
                    const activeClass = state.currentFile === value._path ? 'active' : '';
                    const modified = state.files.get(value._path)?.modified ? '●' : '';
                    
                    parts.push(`
                        <div class="file-tree-item px-2 py-1 cursor-pointer rounded text-sm flex items-center gap-2 ${activeClass}"
                             onclick="openFile('${safePath}')" style="padding-left: ${indent}px" data-path="${safePath}" title="${value._path}">
                            <span class="text-yellow-400 flex-shrink-0">📄</span>
                            <span class="truncate flex-1">${name}</span>
                            ${modified ? '<span class="text-orange-400 flex-shrink-0">●</span>' : ''}
                        </div>
                    `);
                } else {
                    const fullPath = currentPath + name + '/';
                    const isExpanded = state.expandedPaths.has(fullPath);
                    const icon = isExpanded ? '📂' : '📁';
                    
                    parts.push(`
                        <div class="file-tree-item px-2 py-1 text-sm flex items-center gap-2 text-gray-300 cursor-pointer rounded" 
                             style="padding-left: ${indent}px"
                             onclick="toggleFolder('${fullPath}')">
                            <span class="flex-shrink-0">${icon}</span>
                            <span class="font-medium select-none truncate">${name}</span>
                        </div>
                    `);
                    
                    if (isExpanded) {
                        parts.push(renderTreeNode(value, indent + 16, fullPath));
                    }
                }
            }
            return parts.join('');
        }

        function toggleFolder(path) {
            if (state.expandedPaths.has(path)) {
                state.expandedPaths.delete(path);
            } else {
                state.expandedPaths.add(path);
            }
            renderFileTree();
        }

export { buildTree, renderFileTree, renderTreeNode, toggleFolder };
