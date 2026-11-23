        const isElectron = window.electronAPI ? true : false;
        
        // ==================== CONSTANTS ====================
        const LINE_HEIGHT = 22;
        // ==================== GLOBAL STATE ====================
        const state = {
            files: new Map(),
            currentFile: null,
            nodes: [],
            methods: [],
            methodsIndex: null,
            selectedMethod: null,
            selectedNode: null,
            changeHistory: [],
            fileChanges: new Map(), // file -> [{oldCode, newCode, methodName, timestamp}]
            selectedChangeFile: null,
            zoom: 1,
            panX: 0,
            panY: 0,
            draggingNode: null,
            isPanning: false,
            lastMousePos: { x: 0, y: 0 },
            hasMoved: false,
            expandedPaths: new Set(),
            searchQuery: '',
            methodSearchScope: 'file',
            classMap: new Map(),
            totalSize: 0,
            animationFrameId: null,
            lastLineCount: 0,
            fileTypeStats: {},
            sidebarWidth: 280
        };

        // ==================== CACHED DOM ELEMENTS ====================
        const DOM = {};
        
        function cacheDOMElements() {
            DOM.dropZone = document.getElementById('dropZone');
            DOM.fileInput = document.getElementById('fileInput');
            DOM.fileTree = document.getElementById('fileTree');
            DOM.codeEditor = document.getElementById('codeEditor');
            DOM.codeHighlight = document.getElementById('codeHighlight');
            DOM.lineNumbers = document.getElementById('lineNumbers');
            DOM.codeArea = document.getElementById('codeArea');
            DOM.codeWrapper = document.getElementById('codeWrapper');
            DOM.canvas = document.getElementById('dependencyGraph');
            DOM.ctx = DOM.canvas?.getContext('2d');
            DOM.loadingOverlay = document.getElementById('loadingOverlay');
            DOM.currentFile = document.getElementById('currentFile');
            DOM.cursorPos = document.getElementById('cursorPos');
            DOM.fileSize = document.getElementById('fileSize');
            DOM.fileInfo = document.getElementById('fileInfo');
            DOM.fileStructure = document.getElementById('fileStructure');
            DOM.methodList = document.getElementById('methodList');
            DOM.methodSearch = document.getElementById('methodSearch');
            DOM.stubConfig = document.getElementById('stubConfig');
            DOM.stubPlaceholder = document.getElementById('stubPlaceholder');
            DOM.stubPreview = document.getElementById('stubPreview');
            DOM.diffPreview = document.getElementById('diffPreview');
            DOM.currentMethodCode = document.getElementById('currentMethodCode');
            DOM.returnType = document.getElementById('returnType');
            DOM.stubValue = document.getElementById('stubValue');
            DOM.stubValueContainer = document.getElementById('stubValueContainer');
            DOM.customValue = document.getElementById('customValue');
            DOM.customValueContainer = document.getElementById('customValueContainer');
            DOM.selectedMethodInfo = document.getElementById('selectedMethodInfo');
            DOM.projectStats = document.getElementById('projectStats');
            DOM.searchFiles = document.getElementById('searchFiles');
            DOM.loadingBar = document.getElementById('loadingBar');
            DOM.loadingPercent = document.getElementById('loadingPercent');
            DOM.loadingStatus = document.getElementById('loadingStatus');
            DOM.loadingTitle = document.getElementById('loadingTitle');
            DOM.loadingCount = document.getElementById('loadingCount');
            DOM.dependencyInfo = document.getElementById('dependencyInfo');
            DOM.changesList = document.getElementById('changesList');
            DOM.fileDiffView = document.getElementById('fileDiffView');
            DOM.changesCount = document.getElementById('changesCount');
            DOM.totalChanges = document.getElementById('totalChanges');
            DOM.diffFileName = document.getElementById('diffFileName');
            DOM.revertFileBtn = document.getElementById('revertFileBtn');
            DOM.sidebar = document.getElementById('sidebar');
            DOM.sidebarResizer = document.getElementById('sidebarResizer');
        }

export { state, DOM, LINE_HEIGHT, isElectron };
