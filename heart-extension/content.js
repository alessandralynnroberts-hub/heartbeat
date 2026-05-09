// content.js
document.documentElement.setAttribute('data-antigravity-heart-active', 'true');

const HEART_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDIxLjM1bC0xLjQ1LTEuMzJDNS40IDE1LjM2IDIgMTIuMTEgMiA4LjUgMiA1LjQyIDQuNDIgMyA3LjUgM2MxLjc0IDAgMy40MS44MSA0LjUgMi4wOUMxMy4wOSAzLjgxIDE0Ljc2IDMgMTYuNSAzIDM1LjU4IDMgMTggNS40MiAxOCA4LjVjMCAzLjYxLTMuNCA2Ljg2LTguNTUgMTEuODVMMTIgMjEuMzV6IiBmaWxsPSIjZmJiZjI0Ii8+PC9zdmc+`;

// Sync UID and Progress
function syncAll() {
    // 1. Sync UID for Popup
    const uid = document.documentElement.getAttribute('data-heartbeat-uid');
    if (uid) {
        chrome.storage.local.set({ heartbeat_uid: uid });
    }

    // 2. Sync Progress for display
    const progress = document.documentElement.getAttribute('data-heartbeat-progress');
    const projectName = document.documentElement.getAttribute('data-heartbeat-project-name');
    if (progress !== null && projectName !== null) {
        chrome.storage.local.set({ lastProgress: progress, lastProjectName: projectName });
        updateUI(progress, projectName);
    }
}

// Watch for changes on the website
const observer = new MutationObserver(() => syncAll());
observer.observe(document.documentElement, { attributes: true });

// Initial and Periodic Sync
syncAll();
setInterval(syncAll, 2000);

let heartContainer = null;
let heartImg = null;
let heartText = null;
let posX = window.innerWidth - 150, posY = window.innerHeight - 200;
let velX = 0, velY = 0;
let isDragging = false;
let lastMouseX, lastMouseY;
let currentWidth = 100, currentHeight = 100;

function initHeart() {
    if (heartContainer || !document.body) return;

    heartContainer = document.createElement('div');
    heartContainer.id = 'heartbeat-physics-container';
    heartContainer.style.cssText = `
        position: fixed; left: ${posX}px; top: ${posY}px;
        width: ${currentWidth}px; height: ${currentHeight}px;
        z-index: 9999999; cursor: grab; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
    `;

    heartContainer.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <img src="${HEART_SVG}" id="heartbeat-pixel-icon" style="width: 100%; height: 100%; image-rendering: pixelated; filter: drop-shadow(0 0 10px #fbbf24);">
            <div id="heartbeat-percent-text" style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); font-family: 'Space Mono', monospace; font-size: 18px; color: #000; font-weight: bold; pointer-events: none; text-shadow: 1px 1px 0px rgba(255,255,255,0.5);">0%</div>
            <div id="heartbeat-title-hover" style="position: absolute; top: -25px; background: #fbbf24; color: #000; font-family: monospace; font-size: 10px; padding: 2px 5px; border: 1px solid #000; white-space: nowrap;">SELECT PROJECT</div>
        </div>
    `;

    document.body.appendChild(heartContainer);
    heartImg = heartContainer.querySelector('#heartbeat-pixel-icon');
    heartText = heartContainer.querySelector('#heartbeat-percent-text');

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

            if (posX + currentWidth > window.innerWidth) { posX = window.innerWidth - currentWidth; velX *= -bounce; }
            else if (posX < 0) { posX = 0; velX *= -bounce; }

            if (posY + currentHeight > window.innerHeight) { posY = window.innerHeight - currentHeight; velY *= -bounce; }
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
    if (heartText) heartText.innerText = progress + '%';
    const titleEl = heartContainer.querySelector('#heartbeat-title-hover');
    if (titleEl) titleEl.innerText = projectName.toUpperCase();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeart);
} else {
    initHeart();
}
setTimeout(initHeart, 1000);
