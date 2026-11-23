import { hideLoadingOverlay, showLoadingOverlay, updateLoading, updateLoadingOverlay } from '../ui/loading.js';
import { indexClasses, indexMethods } from '../analysis/methods.js';
import { renderFileTree } from './file-tree.js';
import { updateFooterStats } from '../ui/stats.js';
import { showToast } from '../ui/toast.js';
import { DOM, isElectron, state } from '../core/state.js';
import { nextFrame } from '../app/bootstrap.js';

        async function exportProject() {
            const modifiedFiles = Array.from(state.files.entries()).filter(([_, data]) => data.modified);
            
            if (modifiedFiles.length === 0) {
                showToast('Нет изменённых файлов для экспорта', 'warning');
                return;
            }
            
            showLoadingOverlay('Экспорт', 'Создание архива...');
            await nextFrame();
            
            try {
                const zip = new JSZip();
                
                for (const [path, data] of modifiedFiles) {
                    zip.file(path, data.content);
                }
                
                // Add changelog
                let changelog = `# Smali Patch Changelog\n# Generated: ${new Date().toISOString()}\n\n`;
                changelog += `## Modified Files (${modifiedFiles.length}):\n\n`;
                
                for (const [path, _] of modifiedFiles) {
                    const changes = state.fileChanges.get(path) || [];
                    changelog += `### ${path}\n`;
                    changes.forEach(c => {
                        changelog += `- ${c.methodName} (${new Date(c.timestamp).toLocaleString()})\n`;
                    });
                    changelog += '\n';
                }
                
                zip.file('CHANGELOG.md', changelog);
                
                const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `smali-patch-${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                hideLoadingOverlay();
                showToast(`Экспортировано ${modifiedFiles.length} файлов`, 'success');
            } catch (e) {
                hideLoadingOverlay();
                showToast('Ошибка при экспорте: ' + e.message, 'error');
            }
        }

        function getFileExtension(name) {
            if (!name.includes('.')) return 'other';
            return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        }

        function isLoadableFile(name) {
            if (name.startsWith('.') || !name.includes('.')) return false;
            const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
            return ALLOWED_EXTENSIONS.includes(ext);
        }

        async function processFiles(files) {
            updateLoadingOverlay('Импорт проекта', 'Чтение файлов...', 5);
            
            state.files.clear();
            state.methods = [];
            state.methodsIndex = null;
            state.changeHistory = [];
            state.fileChanges.clear();
            state.classMap.clear();
            state.fileTypeStats = {};
            
            let totalSize = 0;
            const totalFiles = files.length;
            const CHUNK_SIZE = 50;
            
            for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
                const chunk = files.slice(i, i + CHUNK_SIZE);
                
                await new Promise(r => setTimeout(r, 0));
                
                await Promise.all(chunk.map(async ({ path, file }) => {
                    let content, size;
                    
                    // If we're in Electron, read the file from the filesystem
                    if (isElectron) {
                        content = await window.electronAPI.readFile(path);
                        // We'll get the size from the content length
                        size = new Blob([content]).size;
                    } else {
                        // In browser environment, read from the File object
                        content = await file.text();
                        size = file.size;
                    }
                    
                    totalSize += size;
                    state.files.set(path, { content, original: content, modified: false, size: size });
                    
                    const ext = getFileExtension(path);
                    state.fileTypeStats[ext] = (state.fileTypeStats[ext] || 0) + 1;
                }));
                
                updateLoading(5 + (i / totalFiles) * 25, 'Чтение файлов...', Math.min(i + CHUNK_SIZE, totalFiles), totalFiles);
            }
            
            state.totalSize = totalSize;
            
            updateLoading(30, 'Построение дерева...', 0, 0);
            await new Promise(r => setTimeout(r, 10));
            renderFileTree();
            
            await indexClasses();
            await indexMethods();
            
            DOM.loadingBar.style.width = '100%';
            DOM.loadingPercent.textContent = '100%';
            DOM.loadingStatus.textContent = 'Готово!';
            
            await new Promise(r => setTimeout(r, 300));
            hideLoadingOverlay();
            showToast(`Загружено ${totalFiles} файлов`, 'success');
            updateFooterStats();
        }

        function saveCurrentFile() {
            if (state.currentFile) {
                const f = state.files.get(state.currentFile);
                f.original = f.content;
                f.modified = false;
                
                // If we're in Electron, save the file to the filesystem
                if (isElectron) {
                    window.electronAPI.writeFile(state.currentFile, DOM.codeEditor.value)
                        .then(success => {
                            if (success) {
                                showToast('Файл сохранён на диск', 'success');
                            } else {
                                showToast('Ошибка при сохранении файла', 'error');
                            }
                        })
                        .catch(err => {
                            console.error('Error saving file:', err);
                            showToast('Ошибка при сохранении файла: ' + err.message, 'error');
                        });
                } else {
                    // Fallback for web environment
                    showToast('Сохранено в памяти', 'success');
                }
                
                renderFileTree();
            }
        }

        async function scanFolder(folderPath) {
            return new Promise((resolve, reject) => {
                // Listen for progress updates
                const progressHandler = (e) => {
                    const { progress, processed, total, currentFile } = e.detail;
                    updateLoading(progress * 0.8, `Сканирование: ${currentFile}`, processed, total);
                };
                
                window.addEventListener('scan-progress', progressHandler);
                
                // Call the async scan function
                window.electronAPI.scanFolderAsync(folderPath)
                    .then(files => {
                        // Remove the progress listener
                        window.removeEventListener('scan-progress', progressHandler);
                        // Return in the expected format
                        const formattedFiles = files.map(file => ({ 
                            path: file.path, 
                            file: null,
                            size: file.size,
                            mtime: file.mtime
                        }));
                        resolve(formattedFiles);
                    })
                    .catch(error => {
                        // Remove the progress listener
                        window.removeEventListener('scan-progress', progressHandler);
                        reject(error);
                    });
            });
        }

export { isLoadableFile, getFileExtension, scanFolder, processFiles, saveCurrentFile, exportProject };
