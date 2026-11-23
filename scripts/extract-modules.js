#!/usr/bin/env node
/*
 * One-time refactor script: splits the monolithic inline <script> of index.html
 * into DDD-organized ES modules under app/js/<domain>/.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 1. Extract inline script (the one without src=)
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) throw new Error(`Expected exactly 1 inline script, got ${scripts.length}`);
const code = scripts[0][1];
const lines = code.split('\n'); // 0-based within extracted script

// 2. Parse top-level function declarations (column-0 `function name(`)
const funcs = []; // {name, start, end}
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
  if (!m) continue;
  let depth = 0, started = false, j = i;
  for (; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) break;
  }
  funcs.push({ name: m[1], start: i, end: j });
}
console.log('Top-level functions found:', funcs.length);

// 3. Function -> domain mapping
const DOMAIN_MAP = {
  'shared/utils': ['debounce', 'throttle', 'escapeRegex'],
  'shared/dom': ['cacheDOMElements'],
  'core/smali-parser': ['extractClassInfo', 'extractClassName', 'detectClassType', 'extractDependencies', 'parseSmaliArgs', 'formatSmaliType', 'getModIcons'],
  'project/file-io': ['isLoadableFile', 'getFileExtension', 'scanFolder', 'processFiles', 'saveCurrentFile', 'exportProject'],
  'project/drag-drop': ['handleDrop', 'traverseFileTree', 'initDragDrop'],
  'project/menu-events': ['initMenuEvents'],
  'project/file-tree': ['buildTree', 'renderFileTree', 'renderTreeNode', 'toggleFolder'],
  'project/search': ['initSearch', 'renderSearchResults'],
  'project/sidebar': ['initSidebarResize'],
  'project/tabs': ['initTabs'],
  'editor/editor': ['initEditor', 'syncEditorGeometry', 'applyStub', 'reindexFileMethods', 'updateLineNumbers', 'scrollToLine', 'formatCode', 'updateCursorPosition', 'openFile', 'updateFileStructure'],
  'editor/stubs': ['generateStubCode', 'updateStubOptions'],
  'editor/license': ['patchLicenseChecks'],
  'analysis/methods': ['indexClasses', 'indexMethods', 'buildMethodsIndex', 'getMethodCode', 'getMethodCodeByLine', 'setMethodScope', 'renderMethodList', 'renderListItems', 'selectMethod', 'updateStubPreview', 'updateDiffPreview', 'updateCurrentCodePreview', 'initMethodControls'],
  'analysis/dependency-graph': ['buildLocalGraph', 'layoutNodes', 'requestRender', 'initCanvas', 'onCanvasMouseDown', 'onCanvasMouseUp', 'onCanvasWheel', 'onCanvasDoubleClick', 'getMousePos', 'findNodeAtPos', 'drawDependencyGraph', 'selectNode', 'focusNode', 'openNodeFile', 'clearNodeSelection', 'resizeCanvas', 'zoomIn', 'zoomOut', 'resetView', 'autoLayout'],
  'changes/changes': ['updateChangesTab', 'selectChangeFile', 'revertSelectedFile', 'revertAllChanges'],
  'ui/loading': ['showLoadingOverlay', 'updateLoadingOverlay', 'hideLoadingOverlay', 'updateLoading'],
  'ui/toast': ['showToast'],
  'ui/stats': ['showStats', 'closeStatsModal', 'updateFooterStats'],
  'app/bootstrap': ['nextFrame'],
};

const funcByName = new Map();
for (const f of funcs) {
  if (funcByName.has(f.name)) throw new Error('Duplicate function: ' + f.name);
  funcByName.set(f.name, f);
}
const assigned = new Map(); // name -> domain
for (const [domain, names] of Object.entries(DOMAIN_MAP)) {
  for (const n of names) {
    if (!funcByName.has(n)) throw new Error(`Mapped function not found in source: ${n}`);
    if (assigned.has(n)) throw new Error(`Function mapped to two domains: ${n}`);
    assigned.set(n, domain);
  }
}
for (const f of funcs) if (!assigned.has(f.name)) throw new Error(`Unmapped function: ${f.name}`);
console.log('All functions mapped.');

// 4. Shared singletons (state / DOM / constants / isElectron) live in core/state.js
const stateStart = lines.findIndex(l => l.includes('// ==================== GLOBAL STATE'));
const constsStart = lines.findIndex(l => l.includes('// ==================== CONSTANTS'));
const utilsEnd = lines.findIndex(l => l.includes('// ==================== GLOBAL STATE'));
const stateEnd = lines.findIndex(l => l.includes('// ==================== INITIALIZATION'));
if (stateStart < 0 || stateEnd < 0 || constsStart < 0) throw new Error('State block markers not found');
// include CONSTANTS..end-of-cached-DOM section (isElectron line is just above CONSTANTS),
// but skip the UTILITIES block (debounce/throttle live in shared/utils.js)
const isElectronLine = lines.findIndex(l => l.includes('const isElectron'));
const singletonBlock = [
  ...lines.slice(isElectronLine, constsStart + 2),   // isElectron + CONSTANTS + LINE_HEIGHT
  ...lines.slice(utilsEnd, stateEnd),                // GLOBAL STATE + CACHED DOM
].join('\n').trimEnd();

// 5. Build module contents
const modules = {}; // domain -> {funcs:[names], extra:''}
for (const [name, domain] of assigned) {
  (modules[domain] ||= { funcs: [], extra: '' }).funcs.push(name);
}
modules['core/state'] = modules['core/state'] || { funcs: [], extra: '' };
modules['core/state'].extra = singletonBlock;

// 6. References analysis
const allNames = funcs.map(f => f.name);
const GLOBALS = ['state', 'DOM', 'LINE_HEIGHT', 'isElectron'];
const CROSS_MODULE_REFS = {}; // domain -> Set of symbols needed from elsewhere
for (const [domain, mod] of Object.entries(modules)) {
  const own = new Set([...mod.funcs, ...(domain === 'core/state' ? GLOBALS : [])]);
  const refs = new Set();
  for (const fname of mod.funcs) {
    const body = lines.slice(funcByName.get(fname).start, funcByName.get(fname).end + 1).join('\n');
    for (const sym of [...allNames, ...GLOBALS]) {
      if (own.has(sym)) continue;
      const re = new RegExp(`\\b${sym.replace(/[$]/g, '\\$')}\\b`);
      if (re.test(body)) refs.add(sym);
    }
  }
  CROSS_MODULE_REFS[domain] = refs;
}

// domain -> file exporting each global/singleton symbol
const homeOf = {};
homeOf['state'] = 'core/state';
homeOf['DOM'] = 'core/state';
homeOf['LINE_HEIGHT'] = 'core/state';
homeOf['isElectron'] = 'core/state';
for (const [domain, mod] of Object.entries(modules)) {
  for (const fname of mod.funcs) homeOf[fname] = domain;
}

const APP_JS = path.join(ROOT, 'app', 'js');
fs.rmSync(APP_JS, { recursive: true, force: true });

function importPath(fromDomain, toDomain) {
  const rel = path.relative('/' + fromDomain, '/' + toDomain).replace(/^(\.\.)?\//, '');
  let p = path.relative(path.dirname('/' + fromDomain), '/' + toDomain);
  if (!p.startsWith('.')) p = './' + p;
  return p.split(path.sep).join('/') + '.js';
}

// Write domain modules
for (const [domain, mod] of Object.entries(modules)) {
  let src = '';
  if (mod.extra) src += mod.extra + '\n\n';
  for (const fname of [...mod.funcs].sort()) {
    const f = funcByName.get(fname);
    src += lines.slice(f.start, f.end + 1).join('\n') + '\n\n';
  }
  src = src.trimEnd() + '\n';

  // exports
  const exportNames = [...(domain === 'core/state' ? GLOBALS : []), ...mod.funcs];
  src += `\nexport { ${exportNames.join(', ')} };\n`;

  // imports for cross-module refs
  const needByTarget = {};
  for (const sym of CROSS_MODULE_REFS[domain]) {
    const target = homeOf[sym];
    if (!target || target === domain) continue;
    (needByTarget[target] ||= new Set()).add(sym);
  }
  let importBlock = '';
  for (const [target, syms] of Object.entries(needByTarget)) {
    importBlock += `import { ${[...syms].sort().join(', ')} } from '${importPath(domain, target)}';\n`;
  }
  if (importBlock) src = importBlock + '\n' + src;

  const file = path.join(APP_JS, domain + '.js');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, src);
  console.log('wrote', path.relative(ROOT, file), `(${mod.funcs.length} functions)`);
}

// 7. app/js/app.js — bootstrap
{
  const i = lines.findIndex(l => l.trimStart().startsWith("document.addEventListener('DOMContentLoaded'"));
  if (i < 0) throw new Error('DOMContentLoaded handler not found');
  let d = 0, s = false, j = i;
  for (; j < lines.length; j++) { for (const ch of lines[j]) { if (ch === '{') { d++; s = true; } else if (ch === '}') d--; } if (s && d === 0) break; }
  var domContentLoadedSrc = lines.slice(i, j + 1).join('\n');
}
const bootImports = `import './registry.js';
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

`;
let bootBody = domContentLoadedSrc.replace(
  "window.addEventListener('resize', throttle(resizeCanvas, 100));",
  "window.addEventListener('resize', throttle(() => { resizeCanvas(); requestRender(); }, 100));"
);
fs.writeFileSync(path.join(APP_JS, 'app.js'), bootImports + bootBody + '\n');
console.log('wrote app/js/app.js');

// 8. window.App registry so inline onclick handlers keep working
const REGISTRY = {
  'shared/dom.js': ['cacheDOMElements'],
  'project/file-io.js': ['saveCurrentFile', 'exportProject'],
  'project/search.js': ['renderSearchResults'],
  'project/tabs.js': ['initTabs'],
  'project/file-tree.js': ['toggleFolder'],
  'editor/editor.js': ['openFile', 'formatCode', 'scrollToLine', 'updateFileStructure'],
  'editor/license.js': ['patchLicenseChecks'],
  'analysis/methods.js': ['selectMethod', 'setMethodScope', 'renderMethodList', 'updateStubPreview', 'updateDiffPreview'],
  'analysis/dependency-graph.js': ['focusNode', 'openNodeFile', 'clearNodeSelection', 'zoomIn', 'zoomOut', 'resetView', 'autoLayout', 'drawDependencyGraph'],
  'changes/changes.js': ['selectChangeFile', 'revertSelectedFile', 'revertAllChanges', 'updateChangesTab'],
  'ui/toast.js': ['showToast'],
  'ui/stats.js': ['showStats', 'closeStatsModal'],
  'ui/loading.js': ['showLoadingOverlay', 'hideLoadingOverlay'],
};
const registryImports = [];
const registryEntries = [];
for (const [file, names] of Object.entries(REGISTRY)) {
  registryImports.push(`import { ${names.join(', ')} } from './${file}';`);
  registryEntries.push(...names);
}
// Expose both bare globals (legacy inline onclick) and a namespaced window.App API.
const registrySrc = registryImports.join('\n') +
  `\n\n// Public API surface used by inline event handlers in index.html\n` +
  `window.App = { ${registryEntries.join(', ')} };\n` +
  `Object.assign(window, window.App);\n`;
fs.writeFileSync(path.join(APP_JS, 'registry.js'), registrySrc);
console.log('wrote app/js/registry.js');

// 9. Rewrite index.html: drop inline script, add module entry
let htmlNew = html.replace(/<script>[\s\S]*?<\/script>\n/, '<script type="module" src="app/js/app.js"></script>\n');
if (htmlNew === html) throw new Error('Inline script replacement failed');
// route all static inline handlers through the window.App namespace
htmlNew = htmlNew.replace(/\b(on(?:click|change|input|submit|dblclick|mousedown))="([a-zA-Z][A-Za-z0-9_$]*)\(/g, '$1="App.$2(');
fs.writeFileSync(path.join(ROOT, 'index.html'), htmlNew);
console.log('rewrote index.html');
