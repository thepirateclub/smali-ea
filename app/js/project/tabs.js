import { buildLocalGraph, resizeCanvas } from '../analysis/dependency-graph.js';
import { updateChangesTab } from '../changes/changes.js';

        function initTabs() {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.classList.add('bg-gray-700'); });
                    btn.classList.add('active'); btn.classList.remove('bg-gray-700');
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                    document.getElementById(btn.dataset.tab + 'Tab').classList.remove('hidden');
                    
                    if (btn.dataset.tab === 'dependencies') {
                        resizeCanvas();
                        buildLocalGraph();
                    }
                    if (btn.dataset.tab === 'changes') {
                        updateChangesTab();
                    }
                });
            });
        }

export { initTabs };
