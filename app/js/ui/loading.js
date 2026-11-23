import { DOM } from '../core/state.js';

        function hideLoadingOverlay() {
            DOM.loadingOverlay.classList.add('hidden');
        }

        function showLoadingOverlay(title, status) {
            DOM.loadingOverlay.classList.remove('hidden');
            DOM.loadingTitle.textContent = title;
            DOM.loadingStatus.textContent = status;
            DOM.loadingBar.style.width = '0%';
            DOM.loadingPercent.textContent = '0%';
            DOM.loadingCount.textContent = '';
        }

        function updateLoading(percent, status, current, total) {
            const safePercent = Math.min(99, Math.max(0, percent));
            DOM.loadingBar.style.width = `${safePercent}%`;
            DOM.loadingPercent.textContent = `${Math.round(safePercent)}%`;
            DOM.loadingStatus.textContent = status;
            DOM.loadingCount.textContent = total > 0 ? `${current} / ${total}` : '';
        }

        function updateLoadingOverlay(title, status, percent) {
            DOM.loadingTitle.textContent = title;
            DOM.loadingStatus.textContent = status;
            DOM.loadingBar.style.width = `${percent}%`;
            DOM.loadingPercent.textContent = `${Math.round(percent)}%`;
        }

export { showLoadingOverlay, updateLoadingOverlay, hideLoadingOverlay, updateLoading };
