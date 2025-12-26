// Import application components
import { app } from '../components/App.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await app.init();
});
