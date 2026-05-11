// content.js
document.documentElement.setAttribute('data-antigravity-heart-active', 'true');

const HEART_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 11" shape-rendering="crispEdges">
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
</svg>`;

const HEART_SVG_DATA = "data:image/svg+xml;base64," + btoa(HEART_SVG_RAW);

function injectStyles() {
    if (!document.head) {
        setTimeout(injectStyles, 100);
        return;
    }
    const style = document.createElement('style');
    style.id = 'heartbeat-styles';
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
}
injectStyles();

function syncAll() {
    const isHeartbeatSite = window.location.href.includes('heartbeat') || window.location.href.includes('alive');
    
    if (isHeartbeatSite) {
        const uid = document.documentElement.getAttribute('data-heartbeat-uid');
        const email = document.documentElement.getAttribute('data-heartbeat-email');
        if (uid) chrome.storage.local.set({ heartbeat_uid: uid });
        if (email) chrome.storage.local.set({ heartbeat_email: email });

        const progress = document.documentElement.getAttribute('data-heartbeat-progress');
        const projectName = document.documentElement.getAttribute('data-heartbeat-project-name');
        
        if (progress !== null && projectName !== null) {
            chrome.storage.local.set({ lastProgress: progress, lastProjectName: projectName });
            updateUI(progress, projectName);
        }
    } else {
        // Persistent sync for non-Heartbeat pages
        chrome.storage.local.get(['lastProgress', 'lastProjectName'], (data) => {
            if (data.lastProgress !== undefined && data.lastProjectName) {
                updateUI(data.lastProgress, data.lastProjectName);
            }
        });
    }
}

// Listen for direct messages from popup
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_PROGRESS') {
        updateUI(message.progress, message.projectName);
        chrome.storage.local.set({ 
            lastProgress: message.progress, 
            lastProjectName: message.projectName 
        });
    }
});

const observer = new MutationObserver(() => syncAll());
observer.observe(document.documentElement, { attributes: true });
syncAll();
setInterval(syncAll, 2000);

let heartContainer = null;
let heartImg = null;
let progressFill = null;
let posX = 100, posY = 100;
let velX = 0, velY = 0;
let isDragging = false;
let lastMouseX, lastMouseY;
let currentSize = 100;
let isInitializing = false;

function initHeart() {
    if (heartContainer || !document.body || isInitializing) return;
    isInitializing = true;

    posX = window.innerWidth - 150;
    posY = window.innerHeight - 200;

    chrome.storage.local.get(['heartSize', 'lastProgress', 'lastProjectName'], (data) => {
        if (data.heartSize) currentSize = parseInt(data.heartSize);
        createHeartUI();
        if (data.lastProgress !== undefined && data.lastProjectName) {
            updateUI(data.lastProgress, data.lastProjectName);
        }
        isInitializing = false;
    });
}

function createHeartUI() {
    if (heartContainer) return;

    heartContainer = document.createElement('div');
    heartContainer.id = 'heartbeat-physics-container';
    heartContainer.className = 'heart-vibrate';
    heartContainer.style.cssText = `
        position: fixed; left: ${posX}px; top: ${posY}px;
        width: ${currentSize}px; height: ${currentSize}px;
        z-index: 9999999; cursor: grab; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
        pointer-events: auto;
    `;

    heartContainer.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <img src="${HEART_SVG_DATA}" id="heartbeat-pixel-icon" style="width: 100%; height: 100%; image-rendering: pixelated; filter: drop-shadow(0 0 10px #fbbf24); transition: transform 0.1s; pointer-events: auto;">
            
            <div id="heartbeat-progress-track" style="position: absolute; bottom: 35%; left: 15%; width: 70%; height: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); overflow: hidden; border-radius: 2px;">
                <div id="heartbeat-progress-fill" style="width: 0%; height: 100%; background: #3b82f6; box-shadow: 0 0 5px #3b82f6; transition: width 0.3s ease;"></div>
            </div>

            <div id="heartbeat-title-hover" style="position: absolute; top: -25px; background: #fbbf24; color: #000; font-family: monospace; font-size: 10px; padding: 2px 5px; border: 1px solid #000; white-space: nowrap; font-weight: bold; opacity: 0; transition: opacity 0.2s;">SELECT PROJECT</div>
        </div>
    `;

    document.body.appendChild(heartContainer);
    heartImg = heartContainer.querySelector('#heartbeat-pixel-icon');
    progressFill = heartContainer.querySelector('#heartbeat-progress-fill');
    const titleEl = heartContainer.querySelector('#heartbeat-title-hover');

    heartContainer.onmouseenter = () => { if (titleEl) titleEl.style.opacity = "1"; };
    heartContainer.onmouseleave = () => { if (titleEl) titleEl.style.opacity = "0"; };

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
    
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.heartSize && heartContainer) {
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
        if (!isDragging && heartContainer) {
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
setTimeout(initHeart, 500);
setTimeout(initHeart, 2000);
