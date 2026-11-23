import { DOM, state } from '../core/state.js';

        function closeStatsModal() {
            document.getElementById('statsModal').classList.add('hidden');
            document.getElementById('statsModal').classList.remove('flex');
        }

        function showStats() {
            const modal = document.getElementById('statsModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            const sizeMB = (state.totalSize / (1024 * 1024)).toFixed(2);
            const totalFiles = state.files.size;
            
            const typeColors = { 'smali': '#3b82f6', 'xml': '#f97316', 'json': '#eab308', 'properties': '#22c55e', 'yml': '#a855f7', 'yaml': '#a855f7', 'txt': '#6b7280' };
            
            let barHtml = '<div class="flex h-4 rounded-full overflow-hidden">';
            let legendHtml = '<div class="grid grid-cols-2 gap-2 mt-3">';
            
            const sortedTypes = Object.entries(state.fileTypeStats).sort((a, b) => b[1] - a[1]);
            
            sortedTypes.forEach(([ext, count]) => {
                const percent = ((count / totalFiles) * 100).toFixed(1);
                const color = typeColors[ext] || '#6b7280';
                barHtml += `<div style="width: ${percent}%; background: ${color};" title="${ext}: ${count} (${percent}%)"></div>`;
                legendHtml += `<div class="flex items-center gap-2 text-xs">
                    <span class="w-3 h-3 rounded" style="background: ${color};"></span>
                    <span class="text-gray-300">.${ext}</span>
                    <span class="text-gray-500 ml-auto">${count} (${percent}%)</span>
                </div>`;
            });
            
            barHtml += '</div>';
            legendHtml += '</div>';
            
            const modifiedCount = Array.from(state.files.values()).filter(f => f.modified).length;
            
            document.getElementById('statsContent').innerHTML = `
                <div class="grid grid-cols-4 gap-4">
                    <div class="bg-gray-700 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-400">${state.files.size}</div><div class="text-xs text-gray-400">Файлов</div>
                    </div>
                    <div class="bg-gray-700 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-400">${state.methods.length}</div><div class="text-xs text-gray-400">Методов</div>
                    </div>
                    <div class="bg-gray-700 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-400">${sizeMB} MB</div><div class="text-xs text-gray-400">Размер</div>
                    </div>
                    <div class="bg-gray-700 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-orange-400">${modifiedCount}</div><div class="text-xs text-gray-400">Изменено</div>
                    </div>
                </div>
                <div class="bg-gray-700 p-4 rounded-lg">
                    <div class="text-sm font-bold mb-3">Типы файлов</div>${barHtml}${legendHtml}
                </div>`;
        }

        function updateFooterStats() {
            const sizeMB = (state.totalSize / (1024 * 1024)).toFixed(2);
            DOM.projectStats.textContent = 
                `Файлов: ${state.files.size} | Размер: ${sizeMB} MB | Методов: ${state.methods.length}`;
        }

export { showStats, closeStatsModal, updateFooterStats };
