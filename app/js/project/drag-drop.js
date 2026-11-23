import { isLoadableFile, processFiles, scanFolder } from './file-io.js';
import { nextFrame } from '../app/bootstrap.js';
import { hideLoadingOverlay, showLoadingOverlay } from '../ui/loading.js';
import { showToast } from '../ui/toast.js';
import { DOM, isElectron } from '../core/state.js';

        async function handleDrop(e) {
            e.preventDefault();
            DOM.dropZone.classList.remove('dragover');
            
            // If we're in Electron, use the file system dialog instead of drag & drop
            if (isElectron) {
                showLoadingOverlay('Сканирование', 'Выбор папки проекта...');
                
                try {
                    const folderPaths = await window.electronAPI.showOpenDialog();
                    
                    if (!folderPaths || folderPaths.length === 0) {
                        hideLoadingOverlay();
                        return; // User cancelled
                    }
                    
                    // Process the selected folder
                    const files = await scanFolder(folderPaths[0]);
                    if (files.length === 0) {
                        hideLoadingOverlay();
                        showToast('Нет поддерживаемых файлов', 'error');
                        return;
                    }
                    
                    await processFiles(files);
                } catch (error) {
                    hideLoadingOverlay();
                    console.error('Error selecting folder:', error);
                    showToast('Ошибка при выборе папки', 'error');
                }
            } else {
                // Browser environment - use drag & drop
                showLoadingOverlay('Сканирование', 'Анализ структуры папок...');
                
                await nextFrame();

                const items = e.dataTransfer.items;
                const files = [];
                
                for (const item of items) {
                    if (item.kind === 'file') {
                        const entry = item.webkitGetAsEntry?.();
                        if (entry) {
                            await traverseFileTree(entry, '', files);
                        } else {
                            const file = item.getAsFile();
                            if (isLoadableFile(file.name)) {
                                files.push({ path: file.name, file });
                            }
                        }
                    }
                }

                if (files.length === 0) {
                    hideLoadingOverlay();
                    showToast('Нет поддерживаемых файлов', 'error');
                    return;
                }
                
                await processFiles(files);
            }
        }

        function initDragDrop() {
            // Click to open file dialog
            DOM.dropZone.addEventListener('click', async () => {
                // If we're in Electron, use the file system dialog instead of file input
                if (isElectron) {
                    showLoadingOverlay('Сканирование', 'Выбор папки проекта...');
                    
                    try {
                        const folderPaths = await window.electronAPI.showOpenDialog();
                        
                        if (!folderPaths || folderPaths.length === 0) {
                            hideLoadingOverlay();
                            return; // User cancelled
                        }
                        
                        // Process the selected folder
                        const files = await scanFolder(folderPaths[0]);
                        if (files.length === 0) {
                            hideLoadingOverlay();
                            showToast('Нет поддерживаемых файлов', 'error');
                            return;
                        }
                        
                        await processFiles(files);
                    } catch (error) {
                        hideLoadingOverlay();
                        console.error('Error selecting folder:', error);
                        showToast('Ошибка при выборе папки', 'error');
                    }
                } else {
                    // Browser environment - use file input
                    DOM.fileInput.click();
                }
            });
            
            // Handle file input change (only for browser environment)
            DOM.fileInput.addEventListener('change', async (e) => {
                // Skip this in Electron environment since we're using the dialog
                if (isElectron) {
                    DOM.fileInput.value = ''; // Clear the input
                    return;
                }
                
                const files = Array.from(e.target.files);
                
                if (files.length === 0) {
                    // User cancelled - do nothing
                    return;
                }
                
                // Show overlay immediately after files are selected
                showLoadingOverlay('Импорт проекта', 'Подготовка файлов...');
                
                // Give browser time to render overlay
                await nextFrame();
                
                const validFiles = files
                    .filter(f => isLoadableFile(f.name))
                    .map(f => ({ path: f.webkitRelativePath || f.name, file: f }));
                    
                if (validFiles.length === 0) {
                    hideLoadingOverlay();
                    showToast('Нет поддерживаемых файлов', 'error');
                    DOM.fileInput.value = '';
                    return;
                }

                await processFiles(validFiles);
                
                // Reset input after processing
                DOM.fileInput.value = '';
            });
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
                DOM.dropZone.addEventListener(event, e => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    
                    // In Electron, we disable drag & drop in favor of the dialog
                    if (isElectron && event === 'drop') {
                        // Show message that drag & drop is not supported in Electron
                        showToast('В Electron используйте кнопку выбора папки', 'info');
                    }
                });
                document.body.addEventListener(event, e => { e.preventDefault(); e.stopPropagation(); });
            });

            ['dragenter', 'dragover'].forEach(event => {
                DOM.dropZone.addEventListener(event, () => {
                    // In Electron, don't show dragover effect since we're using dialog
                    if (!isElectron) {
                        DOM.dropZone.classList.add('dragover');
                    }
                });
            });

            DOM.dropZone.addEventListener('dragleave', () => {
                DOM.dropZone.classList.remove('dragover');
            });

            DOM.dropZone.addEventListener('drop', handleDrop);
        }

        async function traverseFileTree(entry, path, files) {
            if (entry.isFile) {
                if (isLoadableFile(entry.name)) {
                    const file = await new Promise(resolve => entry.file(resolve));
                    files.push({ path: path + entry.name, file });
                }
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const entries = await new Promise(resolve => reader.readEntries(resolve));
                for (const childEntry of entries) {
                    await traverseFileTree(childEntry, path + entry.name + '/', files);
                }
            }
        }

export { handleDrop, traverseFileTree, initDragDrop };
