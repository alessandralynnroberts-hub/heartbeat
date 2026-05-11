// content.js
document.documentElement.setAttribute('data-antigravity-heart-active', 'true');

// Pixel Heart SVG (Yellow)
const HEART_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMSAxMSIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj4KICAgIDxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIyIiBoZWlnaHQ9IjEiIGZpbGw9IiNmYmJmMjQiLz4KICAgIDxyZWN0IHg9IjciIHk9IjIiIHdpZHRoPSIyIiBoZWlnaHQ9IjEiIGZpbGw9IiNmYmJmMjQiLz4KICAgIDxyZWN0IHg9IjEiIHk9IjMiIHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9IiNmYmJmMjQiLz4KICAgIDxyZWN0IHg9IjYiIHk9IjMiIHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9IiNmYmJmMjQiLz4KICAgIDxyZWN0IHg9IjAiIHk9IjQiIHdpZHRoPSIxMSIgaGVpZ2h0PSIyIiBmaWxsPSIjZmJiZjI0Ii8+CiAgICA8cmVjdCB4PSIxIiB5PSI2IiB3aWR0aD0iOSIgaGVpZ2h0PSIxIiBmaWxsPSIjZmJiZjI0Ii8+CiAgICA8cmVjdCB4PSIyIiB5PSI3IiB3aWR0aD0iNyIgaGVpZ2h0PSIxIiBmaWxsPSIjZmJiZjI0Ii8+CiAgICA8cmVjdCB4PSIzIiB5PSI4IiB3aWR0aD0iNSIgaGVpZ2h0PSIxIiBmaWxsPSIjZmJiZjI0Ii8+CiAgICA8cmVjdCB4PSI0IiB5PSI5IiB3aWR0aD0iMyIgaGVpZ2h0PSIxIiBmaWxsPSIjZmJiZjI0Ii8+CiAgICA8cmVjdCB4PSI1IiB5PSIxMCIgd2lkdGg9IjEiIGhlaWdodD0iMSIgZmlsbD0iI2ZiYmYyNCIvPgo8L3N2Zz4=`;

// Inject Vibration CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes heartVibrate {
        0% { transform: translate(0,0) rotate(0deg); }
        25% { transform: translate(-2px, 2px) rotate(1deg); }
        50% { transform: translate(2px, -2px) rotate(-1deg); }
        75% { transform: translate(-2px, -2px) rotate(1deg); }
        100% { transform: translate(0,0) rotate(0deg); }
    }
    .heart-vibrate:hover #heartbeat-pixel-icon {
        animation: heartVibrate 0.1s infinite !important;
    }
`;
document.head.appendChild(style);

function syncAll() {
    const uid = document.documentElement.getAttribute('data-heartbeat-uid');
    if (uid) chrome.storage.local.set({ heartbeat_uid: uid });

    const progress = document.documentElement.getAttribute('data-heartbeat-progress');
    const projectName = document.documentElement.getAttribute('data-heartbeat-project-name');
    if (progress !== null && projectName !== null) {
        chrome.storage.local.set({ lastProgress: progress, lastProjectName: projectName });
        updateUI(progress, projectName);
    }
}

const observer = new MutationObserver(() => syncAll());
observer.observe(document.documentElement, { attributes: true });
syncAll();
setInterval(syncAll, 2000);

let heartContainer = null;
let heartImg = null;
let progressFill = null;
let posX = window.innerWidth - 150, posY = window.innerHeight - 200;
let velX = 0, velY = 0;
let isDragging = false;
let lastMouseX, lastMouseY;
let currentSize = 100;

function initHeart() {
    if (heartContainer || !document.body) return;

    chrome.storage.local.get(['heartSize'], (data) => {
        if (data.heartSize) currentSize = parseInt(data.heartSize);
        createHeartUI();
    });
}

function createHeartUI() {
    heartContainer = document.createElement('div');
    heartContainer.id = 'heartbeat-physics-container';
    heartContainer.className = 'heart-vibrate';
    heartContainer.style.cssText = `
        position: fixed; left: ${posX}px; top: ${posY}px;
        width: ${currentSize}px; height: ${currentSize}px;
        z-index: 9999999; cursor: grab; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
    `;

    heartContainer.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <img src="${HEART_SVG}" id="heartbeat-pixel-icon" style="width: 100%; height: 100%; image-rendering: pixelated; filter: drop-shadow(0 0 10px #fbbf24); transition: transform 0.1s;">
            
            <!-- Progress Bar Overlay -->
            <div id="heartbeat-progress-track" style="position: absolute; bottom: 35%; left: 15%; width: 70%; height: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); overflow: hidden; border-radius: 2px; pointer-events: none;">
                <div id="heartbeat-progress-fill" style="width: 0%; height: 100%; background: #3b82f6; box-shadow: 0 0 5px #3b82f6; transition: width 0.3s ease;"></div>
            </div>

            <div id="heartbeat-title-hover" style="position: absolute; top: -25px; background: #fbbf24; color: #000; font-family: monospace; font-size: 10px; padding: 2px 5px; border: 1px solid #000; white-space: nowrap; font-weight: bold;">SELECT PROJECT</div>
        </div>
    `;

    document.body.appendChild(heartContainer);
    heartImg = heartContainer.querySelector('#heartbeat-pixel-icon');
    progressFill = heartContainer.querySelector('#heartbeat-progress-fill');

    heartContainer.onmousedown = (e) => {
        isDragging = true;
        velX = 0; velY = 0;
        lastMouseX = e.clientX; lastMouseY = e.clientY;
        e.preventDefault();
    };

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            posX += dx; posY += dy;
            velX = dx; velY = dy;
            lastMouseX = e.clientX; lastMouseY = e.clientY;
            updatePosition();
        }
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    
    // Listen for size changes from popup
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.heartSize) {
            currentSize = parseInt(changes.heartSize.newValue);
            heartContainer.style.width = currentSize + 'px';
            heartContainer.style.height = currentSize + 'px';
        }
    });

    startPhysics();
}

function updatePosition() {
    if (!heartContainer) return;
    heartContainer.style.left = posX + 'px';
    heartContainer.style.top = posY + 'px';
}

function startPhysics() {
    const gravity = 0.3;
    const friction = 0.98;
    const bounce = 0.7;

    function loop() {
        if (!isDragging) {
            velY += gravity;
            velX *= friction; velY *= friction;
            posX += velX; posY += velY;

            if (posX + currentSize > window.innerWidth) { posX = window.innerWidth - currentSize; velX *= -bounce; }
            else if (posX < 0) { posX = 0; velX *= -bounce; }

            if (posY + currentSize > window.innerHeight) { posY = window.innerHeight - currentSize; velY *= -bounce; }
            else if (posY < 0) { posY = 0; velY *= -bounce; }

            updatePosition();
        }
        if (heartImg) {
            const scale = 1 + (Math.sin(Date.now() / 200) * 0.05);
            heartImg.style.transform = `scale(${scale})`;
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

function updateUI(progress, projectName) {
    if (!heartContainer) return;
    if (progressFill) progressFill.style.width = progress + '%';
    const titleEl = heartContainer.querySelector('#heartbeat-title-hover');
    if (titleEl) titleEl.innerText = projectName.toUpperCase();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeart);
} else {
    initHeart();
}
setTimeout(initHeart, 1000);
