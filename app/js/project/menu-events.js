import { processFiles, scanFolder } from './file-io.js';
import { hideLoadingOverlay, showLoadingOverlay } from '../ui/loading.js';
import { openFile } from '../editor/editor.js';
import { showToast } from '../ui/toast.js';
import { isElectron } from '../core/state.js';

        function initMenuEvents() {
            if (!isElectron) return;

            window.addEventListener('folder-selected', async (e) => {
                const folderPaths = e.detail || [];
                if (folderPaths.length === 0) return;

                showLoadingOverlay('Сканирование', 'Выбор папки проекта...');
                try {
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
            });

            window.addEventListener('file-selected', async (e) => {
                const filePaths = e.detail || [];
                if (filePaths.length === 0) return;

                try {
                    const files = filePaths.map(p => ({ path: p, file: null }));
                    await processFiles(files);
                    await openFile(filePaths[0]);
                } catch (error) {
                    console.error('Error opening file:', error);
                    showToast('Ошибка при открытии файла', 'error');
                }
            });
        }

export { initMenuEvents };
