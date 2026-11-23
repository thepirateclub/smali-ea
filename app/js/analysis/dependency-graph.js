import { extractClassName, extractDependencies, formatSmaliType, getModIcons, parseSmaliArgs } from '../core/smali-parser.js';
import { DOM, state } from '../core/state.js';
import { openFile } from '../editor/editor.js';

        function autoLayout() { buildLocalGraph(); }

        function buildLocalGraph() {
            if (!state.currentFile || !state.currentFile.endsWith('.smali')) {
                state.nodes = [];
                drawDependencyGraph();
                return;
            }
            
            const fileData = state.files.get(state.currentFile);
            if (!fileData) return;
            
            const currentClassName = extractClassName(fileData.content);
            if (!currentClassName) {
                state.nodes = [];
                drawDependencyGraph();
                return;
            }
            
            const nodesMap = new Map();
            
            const addNode = (className, isCentral = false) => {
                if (nodesMap.has(className)) return nodesMap.get(className);
                const info = state.classMap.get(className);
                if (!info && !isCentral) return null; 
                
                const node = {
                    id: className,
                    name: className.split('/').pop().replace(';', ''),
                    fullName: className,
                    path: info?.path || state.currentFile,
                    type: info?.type || 'class',
                    superClass: info?.superClass,
                    interfaces: info?.interfaces || [],
                    fields: info?.fields || [],
                    methods: info?.methods || [],
                    annotations: info?.annotations || [],
                    source: info?.source,
                    uses: [],
                    usedBy: [],
                    isCentral
                };
                nodesMap.set(className, node);
                return node;
            };
            
            const central = addNode(currentClassName, true);
            if (!central) return;
            
            const uses = extractDependencies(fileData.content, currentClassName);
            uses.forEach(dep => {
                const n = addNode(dep);
                if (n) central.uses.push(n.id);
            });
            
            let usageCount = 0;
            for (const [path, fData] of state.files) {
                if (usageCount >= 30) break;
                if (path === state.currentFile || !path.endsWith('.smali')) continue;
                 
                if (fData.content.includes(currentClassName)) {
                    const userClass = extractClassName(fData.content);
                    if (userClass && userClass !== currentClassName) {
                        const n = addNode(userClass);
                        if (n) {
                            n.uses.push(central.id);
                            central.usedBy.push(userClass);
                            usageCount++;
                        }
                    }
                }
            }
            
            const nodes = Array.from(nodesMap.values());
            layoutNodes(nodes, central);
            state.nodes = nodes;
            drawDependencyGraph();
        }

        function clearNodeSelection() {
            state.selectedNode = null;
            DOM.dependencyInfo.innerHTML = '<p class="text-gray-500 text-center py-8">Кликните на узел графа<br>для просмотра информации</p>';
            requestRender();
        }

        function drawDependencyGraph() {
            DOM.ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
            if (state.nodes.length === 0) {
                DOM.ctx.fillStyle = '#6b7280';
                DOM.ctx.font = '14px Inter';
                DOM.ctx.textAlign = 'center';
                DOM.ctx.fillText('Откройте .smali файл для отображения зависимостей', DOM.canvas.width / 2, DOM.canvas.height / 2);
                return;
            }
            
            DOM.ctx.save();
            DOM.ctx.translate(state.panX, state.panY);
            DOM.ctx.scale(state.zoom, state.zoom);
            
            state.nodes.forEach(node => {
                node.uses.forEach(depId => {
                    const t = state.nodes.find(n => n.id === depId);
                    if (t) {
                        DOM.ctx.strokeStyle = node.isCentral ? '#22c55e' : '#374151';
                        DOM.ctx.lineWidth = node.isCentral ? 2 : 1;
                        DOM.ctx.beginPath();
                        DOM.ctx.moveTo(node.x, node.y);
                        DOM.ctx.lineTo(t.x, t.y);
                        DOM.ctx.stroke();
                        
                        const angle = Math.atan2(t.y - node.y, t.x - node.x);
                        const arrowX = t.x - Math.cos(angle) * (t.radius + 5);
                        const arrowY = t.y - Math.sin(angle) * (t.radius + 5);
                        DOM.ctx.beginPath();
                        DOM.ctx.moveTo(arrowX, arrowY);
                        DOM.ctx.lineTo(arrowX - 10 * Math.cos(angle - 0.4), arrowY - 10 * Math.sin(angle - 0.4));
                        DOM.ctx.lineTo(arrowX - 10 * Math.cos(angle + 0.4), arrowY - 10 * Math.sin(angle + 0.4));
                        DOM.ctx.closePath();
                        DOM.ctx.fillStyle = node.isCentral ? '#22c55e' : '#374151';
                        DOM.ctx.fill();
                    }
                });
            });
            
            state.nodes.forEach(node => {
                DOM.ctx.beginPath();
                DOM.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                
                let color = '#3b82f6';
                if (node.type === 'activity') color = '#22c55e';
                else if (node.type === 'service') color = '#a855f7';
                else if (node.type === 'interface') color = '#eab308';
                if (node.isCentral) color = '#f97316';
                
                DOM.ctx.fillStyle = color;
                DOM.ctx.fill();
                
                if (state.selectedNode?.id === node.id) {
                    DOM.ctx.strokeStyle = 'white';
                    DOM.ctx.lineWidth = 3;
                    DOM.ctx.stroke();
                }
                
                DOM.ctx.fillStyle = 'white';
                DOM.ctx.font = '10px Inter';
                DOM.ctx.textAlign = 'center';
                DOM.ctx.fillText(node.name.substring(0, 12), node.x, node.y + node.radius + 14);
            });
            
            DOM.ctx.restore();
        }

        function findNodeAtPos(x, y) {
            for (let i = state.nodes.length - 1; i >= 0; i--) {
                const n = state.nodes[i];
                if ((x - n.x) ** 2 + (y - n.y) ** 2 <= n.radius ** 2) return n;
            }
            return null;
        }

        function focusNode(id) {
            const node = state.nodes.find(n => n.id === id);
            if (node) {
                selectNode(node);
                state.panX = DOM.canvas.width / 2 - node.x * state.zoom;
                state.panY = DOM.canvas.height / 2 - node.y * state.zoom;
                requestRender();
            }
        }

        function getMousePos(e) {
            const r = DOM.canvas.getBoundingClientRect();
            return { x: (e.clientX - r.left - state.panX) / state.zoom, y: (e.clientY - r.top - state.panY) / state.zoom };
        }

        function initCanvas() {
            if (!DOM.canvas) return;
            DOM.canvas.addEventListener('mousedown', onCanvasMouseDown);
            DOM.canvas.addEventListener('mousemove', throttledCanvasMouseMove);
            DOM.canvas.addEventListener('mouseup', onCanvasMouseUp);
            DOM.canvas.addEventListener('mouseleave', onCanvasMouseUp);
            DOM.canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
            DOM.canvas.addEventListener('dblclick', onCanvasDoubleClick);
        }

        function layoutNodes(nodes, central) {
            const centerX = DOM.canvas.width / 2;
            const centerY = DOM.canvas.height / 2;
            
            central.x = centerX;
            central.y = centerY;
            central.radius = 30;
            
            const others = nodes.filter(n => n !== central);
            const count = others.length;
            const radius = Math.min(300, Math.max(150, count * 15));
            
            others.forEach((n, i) => {
                const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                n.x = centerX + Math.cos(angle) * radius;
                n.y = centerY + Math.sin(angle) * radius;
                n.radius = 22;
            });
            
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
        }

        function onCanvasDoubleClick(e) {
            const pos = getMousePos(e);
            const node = findNodeAtPos(pos.x, pos.y);
            if (node && node.path) {
                openFile(node.path);
                document.querySelector('[data-tab="editor"]').click();
            }
        }

        function onCanvasMouseDown(e) {
            const pos = getMousePos(e);
            const node = findNodeAtPos(pos.x, pos.y);
            state.hasMoved = false;
            if (node) {
                state.draggingNode = node;
                state.clickedNode = node;
                DOM.canvas.classList.add('dragging');
            } else {
                state.isPanning = true;
                state.lastMousePos = {x: e.clientX, y: e.clientY};
                DOM.canvas.classList.add('dragging');
            }
        }

        function onCanvasMouseUp() {
            if (!state.hasMoved && state.clickedNode) {
                selectNode(state.clickedNode);
            }
            state.draggingNode = null;
            state.isPanning = false;
            state.clickedNode = null;
            DOM.canvas.classList.remove('dragging');
        }

        function onCanvasWheel(e) {
            e.preventDefault();
            const d = e.deltaY > 0 ? 0.9 : 1.1;
            state.zoom = Math.max(0.2, Math.min(3, state.zoom * d));
            requestRender();
        }

        function openNodeFile(path) {
            if (path) {
                openFile(path);
                document.querySelector('[data-tab="editor"]').click();
            }
        }

        function requestRender() {
            if (!state.animationFrameId) {
                state.animationFrameId = requestAnimationFrame(() => {
                    drawDependencyGraph();
                    state.animationFrameId = null;
                });
            }
        }

        function resetView() { state.zoom = 1; state.panX = 0; state.panY = 0; requestRender(); }

        function resizeCanvas() {
            if (DOM.canvas && DOM.canvas.parentElement) {
                DOM.canvas.width = DOM.canvas.parentElement.offsetWidth;
                DOM.canvas.height = DOM.canvas.parentElement.offsetHeight;
                drawDependencyGraph();
            }
        }

        function selectNode(node) {
            state.selectedNode = node;
            
            const typeLabels = { 'class': '📦 Класс', 'activity': '📱 Activity', 'service': '⚙️ Service', 'interface': '🔌 Interface' };
            const typeColors = { 'class': 'text-blue-400', 'activity': 'text-green-400', 'service': 'text-purple-400', 'interface': 'text-yellow-400' };
            
            let html = `
                <div class="dep-info-card">
                    <div class="label">Имя класса</div>
                    <div class="value font-bold text-base ${typeColors[node.type] || 'text-blue-400'}">${node.name}</div>
                </div>
                <div class="dep-info-card">
                    <div class="label">Тип</div>
                    <div class="value">${typeLabels[node.type] || node.type}</div>
                </div>
                <div class="dep-info-card">
                    <div class="label">Полный путь</div>
                    <div class="value font-mono text-xs">${node.fullName}</div>
                </div>
            `;
            
            if (node.source) {
                html += `<div class="dep-info-card"><div class="label">Исходный файл</div><div class="value text-yellow-300">${node.source}</div></div>`;
            }
            
            if (node.superClass) {
                html += `<div class="dep-info-card"><div class="label">Родитель</div><div class="value font-mono text-xs text-purple-300">${formatSmaliType(node.superClass)}</div></div>`;
            }
            
            if (node.interfaces?.length > 0) {
                html += `<div class="dep-info-card"><div class="label">Интерфейсы (${node.interfaces.length})</div><div class="value flex flex-wrap gap-1 mt-1">
                    ${node.interfaces.map(i => `<span class="px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded text-[10px] font-mono">${formatSmaliType(i)}</span>`).join('')}
                </div></div>`;
            }
            
            html += `<div class="grid grid-cols-2 gap-2 mb-3">
                <div class="dep-info-card"><div class="label">Полей</div><div class="value text-lg font-bold text-blue-400">${node.fields?.length || 0}</div></div>
                <div class="dep-info-card"><div class="label">Методов</div><div class="value text-lg font-bold text-green-400">${node.methods?.length || 0}</div></div>
            </div>`;
            
            if (node.fields?.length > 0) {
                html += `<div class="dep-info-card"><div class="label">📦 Поля</div><div class="value max-h-28 overflow-y-auto mt-1">
                    ${node.fields.slice(0, 15).map(f => `<div class="py-0.5 border-b border-gray-700 flex items-center gap-1">
                        ${getModIcons(f.modifiers)}<span class="text-blue-300 font-mono text-[10px]">${f.name}</span>
                        <span class="text-gray-500 text-[10px] ml-auto">: ${formatSmaliType(f.type)}</span>
                    </div>`).join('')}
                    ${node.fields.length > 15 ? `<div class="text-gray-500 text-[10px] py-1">...и ещё ${node.fields.length - 15}</div>` : ''}
                </div></div>`;
            }
            
            if (node.methods?.length > 0) {
                html += `<div class="dep-info-card"><div class="label">⚙️ Методы</div><div class="value max-h-40 overflow-y-auto mt-1">
                    ${node.methods.slice(0, 20).map(m => `<div class="py-1 border-b border-gray-700">
                        <div class="flex items-center gap-1 flex-wrap">${getModIcons(m.modifiers)}
                            <span class="text-purple-300 font-mono text-[10px] font-medium">${m.name === '<init>' ? '● constructor' : (m.name === '<clinit>' ? '◆ static' : m.name)}</span>
                        </div>
                        <div class="text-gray-500 text-[9px] font-mono">(${parseSmaliArgs(m.params).join(', ') || ''}) → ${formatSmaliType(m.returnType)}</div>
                    </div>`).join('')}
                    ${node.methods.length > 20 ? `<div class="text-gray-500 text-[10px] py-1">...и ещё ${node.methods.length - 20}</div>` : ''}
                </div></div>`;
            }
            
            if (node.uses.length > 0) {
                html += `<div class="dep-info-card"><div class="label text-green-400">📤 Использует (${node.uses.length})</div><div class="value max-h-24 overflow-y-auto">
                    ${node.uses.map(id => { const n = state.nodes.find(x => x.id === id); return n ? `<div class="py-0.5 border-l-2 border-green-500 pl-2 text-[10px] hover:bg-gray-700/50 cursor-pointer" onclick="focusNode('${id}')">${n.name}</div>` : ''; }).join('')}
                </div></div>`;
            }
            
            if (node.usedBy?.length > 0) {
                html += `<div class="dep-info-card"><div class="label text-orange-400">📥 Используется в (${node.usedBy.length})</div><div class="value max-h-24 overflow-y-auto">
                    ${node.usedBy.map(id => { const n = state.nodes.find(x => x.id === id); return n ? `<div class="py-0.5 border-l-2 border-orange-500 pl-2 text-[10px] hover:bg-gray-700/50 cursor-pointer" onclick="focusNode('${id}')">${n.name}</div>` : ''; }).join('')}
                </div></div>`;
            }
            
            html += `<div class="flex gap-2 mt-3">
                <button onclick="openNodeFile('${node.path}')" class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium">📂 Открыть файл</button>
                <button onclick="clearNodeSelection()" class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs">✕</button>
            </div>`;
            
            DOM.dependencyInfo.innerHTML = html;
            requestRender();
        }

        function zoomIn() { state.zoom *= 1.2; requestRender(); }

        function zoomOut() { state.zoom /= 1.2; requestRender(); }

export { buildLocalGraph, layoutNodes, requestRender, initCanvas, onCanvasMouseDown, onCanvasMouseUp, onCanvasWheel, onCanvasDoubleClick, getMousePos, findNodeAtPos, drawDependencyGraph, selectNode, focusNode, openNodeFile, clearNodeSelection, resizeCanvas, zoomIn, zoomOut, resetView, autoLayout };
