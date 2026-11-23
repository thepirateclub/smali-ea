        function nextFrame() {
            return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        }

export { nextFrame };
