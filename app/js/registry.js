import { cacheDOMElements } from './shared/dom.js';
import { saveCurrentFile, exportProject } from './project/file-io.js';
import { renderSearchResults } from './project/search.js';
import { initTabs } from './project/tabs.js';
import { toggleFolder } from './project/file-tree.js';
import { openFile, formatCode, scrollToLine, updateFileStructure } from './editor/editor.js';
import { patchLicenseChecks } from './editor/license.js';
import { selectMethod, setMethodScope, renderMethodList, updateStubPreview, updateDiffPreview } from './analysis/methods.js';
import { focusNode, openNodeFile, clearNodeSelection, zoomIn, zoomOut, resetView, autoLayout, drawDependencyGraph } from './analysis/dependency-graph.js';
import { selectChangeFile, revertSelectedFile, revertAllChanges, updateChangesTab } from './changes/changes.js';
import { showToast } from './ui/toast.js';
import { showStats, closeStatsModal } from './ui/stats.js';
import { showLoadingOverlay, hideLoadingOverlay } from './ui/loading.js';

// Public API surface used by inline event handlers in index.html
window.App = { cacheDOMElements, saveCurrentFile, exportProject, renderSearchResults, initTabs, toggleFolder, openFile, formatCode, scrollToLine, updateFileStructure, patchLicenseChecks, selectMethod, setMethodScope, renderMethodList, updateStubPreview, updateDiffPreview, focusNode, openNodeFile, clearNodeSelection, zoomIn, zoomOut, resetView, autoLayout, drawDependencyGraph, selectChangeFile, revertSelectedFile, revertAllChanges, updateChangesTab, showToast, showStats, closeStatsModal, showLoadingOverlay, hideLoadingOverlay };
Object.assign(window, window.App);
