import { DOM, state } from '../core/state.js';

        function initSidebarResize() {
            let isResizing = false;
            
            DOM.sidebarResizer.addEventListener('mousedown', (e) => {
                isResizing = true;
                DOM.sidebarResizer.classList.add('active');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const newWidth = Math.max(200, Math.min(500, e.clientX));
                DOM.sidebar.style.width = newWidth + 'px';
                state.sidebarWidth = newWidth;
            });
            
            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    DOM.sidebarResizer.classList.remove('active');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        }

export { initSidebarResize };
