import './registry.js';
import { cacheDOMElements } from './shared/dom.js';
import { initDragDrop } from './project/drag-drop.js';
import { initMenuEvents } from './project/menu-events.js';
import { initTabs } from './project/tabs.js';
import { initEditor } from './editor/editor.js';
import { initCanvas, resizeCanvas, requestRender } from './analysis/dependency-graph.js';
import { initMethodControls } from './analysis/methods.js';
import { initSearch } from './project/search.js';
import { initSidebarResize } from './project/sidebar.js';
import { throttle } from './shared/utils.js';

        document.addEventListener('DOMContentLoaded', () => {
            cacheDOMElements();
            initDragDrop();
            initMenuEvents();
            initTabs();
            initEditor();
            initCanvas();
            initMethodControls();
            initSearch();
            initSidebarResize();
            resizeCanvas();
            window.addEventListener('resize', throttle(() => { resizeCanvas(); requestRender(); }, 100));
        });
