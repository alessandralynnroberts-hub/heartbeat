// Heartbeat Extension Content Script

(function() {
    if (window.hasAntigravityHeart) return;
    window.hasAntigravityHeart = true;

    // Extension Injection Marker
    document.documentElement.setAttribute('data-antigravity-heart-active', 'true');

    // State & Config
    const container = document.createElement('div');
    container.className = 'antigravity-heart-container';
    container.id = 'antigravity-heart-container';

    // Heart SVG from the website - Yellow Pixelated Heart
    container.innerHTML = `
        <svg class="antigravity-pixel-heart" viewBox="0 0 11 11" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
            <rect x="2" y="2" width="2" height="1" fill="#fbbf24"/>
            <rect x="7" y="2" width="2" height="1" fill="#fbbf24"/>
            <rect x="1" y="3" width="4" height="1" fill="#fbbf24"/>
            <rect x="6" y="3" width="4" height="1" fill="#fbbf24"/>
            <rect x="0" y="4" width="11" height="2" fill="#fbbf24"/>
            <rect x="1" y="6" width="9" height="1" fill="#fbbf24"/>
            <rect x="2" y="7" width="7" height="1" fill="#fbbf24"/>
            <rect x="3" y="8" width="5" height="1" fill="#fbbf24"/>
            <rect x="4" y="9" width="3" height="1" fill="#fbbf24"/>
            <rect x="5" y="10" width="1" height="1" fill="#fbbf24"/>
        </svg>
    `;

    // Physics State
    let isDragging = false;
    let x = window.innerWidth - 150;
    let y = window.innerHeight - 150;
    let vx = 0;
    let vy = 0;
    let lastX = x;
    let lastY = y;
    let lastTime = performance.now();
    let currentSize = 64;

    const gravity = 0.8;
    const friction = 0.99;
    const bounce = 0.6;

    function updatePhysics() {
        if (!isDragging) {
            vy += gravity;
            vx *= friction;
            vy *= friction;

            x += vx;
            y += vy;

            // Boundary checks (Bounce)
            const right = window.innerWidth - currentSize;
            const bottom = window.innerHeight - currentSize;

            if (x > right) { x = right; vx *= -bounce; }
            if (x < 0) { x = 0; vx *= -bounce; }
            if (y > bottom) { y = bottom; vy *= -bounce; vy = Math.abs(vy) < 1 ? 0 : vy; } // Stop jitter
            if (y < 0) { y = 0; vy *= -bounce; }

            container.style.left = x + 'px';
            container.style.top = y + 'px';
        }
        requestAnimationFrame(updatePhysics);
    }

    // Dragging & Throwing Logic
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        vx = 0;
        vy = 0;
        container.classList.add('vibrating');
        
        const offsetX = e.clientX - x;
        const offsetY = e.clientY - y;

        function onMouseMove(e) {
            const now = performance.now();
            const dt = now - lastTime;
            
            if (dt > 0) {
                // Calculate velocity for throwing
                vx = (e.clientX - offsetX - x) / (dt / 16);
                vy = (e.clientY - offsetY - y) / (dt / 16);
            }

            x = e.clientX - offsetX;
            y = e.clientY - offsetY;

            container.style.left = x + 'px';
            container.style.top = y + 'px';
            
            lastTime = now;
        }

        function onMouseUp() {
            isDragging = false;
            container.classList.remove('vibrating');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Ensure injection
    function init() {
        if (!document.body) {
            setTimeout(init, 100);
            return;
        }
        document.body.appendChild(container);
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        requestAnimationFrame(updatePhysics);
    }

    init();

    // Load saved size
    chrome.storage.sync.get(['heartSize'], (result) => {
        if (result.heartSize) {
            updateSize(result.heartSize);
        }
    });

    // Listen for size updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateSize') {
            updateSize(request.size);
        }
    });

    function updateSize(size) {
        currentSize = parseInt(size);
        const heart = container.querySelector('.antigravity-pixel-heart');
        if (heart) {
            heart.style.width = size + 'px';
            heart.style.height = size + 'px';
        }
    }
})();
