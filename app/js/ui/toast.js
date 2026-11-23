        function showToast(msg, type) {
            const t = document.createElement('div');
            const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-600', info: 'bg-blue-600' };
            t.className = `toast px-4 py-2 rounded shadow ${colors[type] || colors.info}`;
            t.textContent = msg;
            document.getElementById('toastContainer').appendChild(t);
            setTimeout(() => t.remove(), 3000);
        }

export { showToast };
