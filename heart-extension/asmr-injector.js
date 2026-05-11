// asmr-injector.js
(function() {
    if (window.asmrPlayerInitialized) {
        console.log("[ASMR Lifecycle] Injector already active in this tab.");
        return;
    }
    window.asmrPlayerInitialized = true;

    let shadow = null;
    let container = null;
    let player = null;
    let heartbeatInterval = null;
    let videoData = null;

    console.log("[ASMR Lifecycle] Injector initialized in tab.");

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'ASMR_UI_RENDER') {
            console.log("[ASMR Lifecycle] ASMR_UI_RENDER received. Video:", msg.video.videoId);
            videoData = msg.video;
            renderPlayer(msg.video, msg.time, msg.props);
        }
        if (msg.type === 'ASMR_UI_REMOVE') {
            console.log("[ASMR Lifecycle] ASMR_UI_REMOVE received. Cleaning up.");
            removePlayer();
        }
    });

    function renderPlayer(video, startTime, props) {
        // Singleton Guard: If host already exists, just update it if possible, or remove and rebuild
        let host = document.getElementById('heartbeat-asmr-host');
        if (host && container) {
            console.log("[ASMR Lifecycle] Player already exists. Updating properties.");
            updatePlayerProps(props);
            return;
        }

        if (!container) {
            console.log("[ASMR Lifecycle] Creating new player container.");
            host = host || document.createElement('div');
            host.id = 'heartbeat-asmr-host';
            if (!host.parentElement) document.body.appendChild(host);
            
            shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
            shadow.innerHTML = ''; // Fresh start
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('asmr-player.css');
            shadow.appendChild(link);

            container = document.createElement('div');
            container.className = 'asmr-player-container';
            container.style.cssText = `
                position: fixed; background: #000; border: 2px solid #fbbf24;
                z-index: 2147483647; display: flex; flex-direction: column;
                box-shadow: 10px 10px 0px #000; overflow: hidden;
            `;
            shadow.appendChild(container);

            container.innerHTML = `
                <div class="asmr-player-header" style="background:#fbbf24;color:#000;padding:4px 12px;display:flex;justify-content:space-between;cursor:move;font-weight:bold;font-size:11px;">
                    <span>FOCUS: ${video.title}</span>
                    <div class="asmr-player-controls">
                        <button class="minimize-btn" style="background:none;border:none;cursor:pointer;">_</button>
                        <button class="close-btn" style="background:none;border:none;cursor:pointer;">×</button>
                    </div>
                </div>
                <div class="asmr-video-wrapper" id="player-target" style="flex:1;background:#000;min-height:100px;"></div>
                <div class="asmr-resize-handle"></div>
            `;

            initDraggable(container, shadow.querySelector('.asmr-player-header'));
            initResizable(container, shadow.querySelector('.asmr-resize-handle'));
            
            shadow.querySelector('.close-btn').onclick = () => {
                console.log("[ASMR Lifecycle] Close button clicked.");
                chrome.runtime.sendMessage({ type: 'ASMR_STOP' });
                removePlayer();
            };
            
            shadow.querySelector('.minimize-btn').onclick = () => {
                container.classList.toggle('minimized');
                syncState(true);
            };
        }

        updatePlayerProps(props);

        const startSec = Math.floor(startTime || 0);
        const target = shadow.getElementById('player-target');

        // Render Iframe immediately
        target.innerHTML = `<iframe 
            src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&start=${startSec}&rel=0&modestbranding=1" 
            style="width:100%;height:100%;border:none;" 
            allow="autoplay; encrypted-media" 
            allowfullscreen>
        </iframe>`;

        loadYouTubeAPI(() => {
            if (player) {
                try { player.loadVideoById(video.videoId, startSec); } catch(e) {}
            } else {
                player = new YT.Player(target, {
                    height: '100%', width: '100%', videoId: video.videoId,
                    host: 'https://www.youtube-nocookie.com',
                    playerVars: { 'autoplay': 1, 'controls': 1, 'start': startSec, 'origin': window.location.origin },
                    events: {
                        'onReady': (event) => { startHeartbeat(); },
                        'onStateChange': (event) => { if (event.data === YT.PlayerState.PAUSED) syncState(true); },
                        'onError': (e) => { console.error("[ASMR Lifecycle] YT Player Error:", e.data); }
                    }
                });
            }
        });
    }

    function updatePlayerProps(props) {
        if (!container || !props) return;
        container.style.left = props.x + 'px';
        container.style.top = props.y + 'px';
        container.style.width = props.width + 'px';
        container.style.height = props.height + 'px';
        if (props.isMinimized) container.classList.add('minimized');
    }

    function loadYouTubeAPI(callback) {
        if (window.YT && window.YT.Player) return callback();
        const existingCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (existingCallback) existingCallback(); callback(); };

        if (!document.getElementById('yt-iframe-api')) {
            const tag = document.createElement('script');
            tag.id = 'yt-iframe-api';
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        }
    }

    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => syncState(), 8000);
    }

    function syncState(immediate = false) {
        if (!player || !player.getCurrentTime || !container) return;
        chrome.runtime.sendMessage({
            type: 'ASMR_HEARTBEAT',
            time: player.getCurrentTime(),
            props: {
                x: parseInt(container.style.left),
                y: parseInt(container.style.top),
                width: parseInt(container.style.width),
                height: parseInt(container.style.height),
                isMinimized: container.classList.contains('minimized')
            }
        });
    }

    function removePlayer() {
        console.log("[ASMR Lifecycle] removePlayer() called.");
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        
        if (player) {
            try { player.destroy(); } catch(e) {}
            player = null;
        }

        const host = document.getElementById('heartbeat-asmr-host');
        if (host) host.remove();
        
        container = null;
        shadow = null;
        window.asmrPlayerInitialized = false;
    }

    function initDraggable(el, header) {
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        header.onmousedown = (e) => {
            isDragging = true;
            offset.x = e.clientX - el.offsetLeft;
            offset.y = e.clientY - el.offsetTop;
            header.style.cursor = 'grabbing';
        };
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            el.style.left = (e.clientX - offset.x) + 'px';
            el.style.top = (e.clientY - offset.y) + 'px';
        });
        window.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; header.style.cursor = 'move'; syncState(true); }
        });
    }

    function initResizable(el, handle) {
        let isResizing = false;
        handle.onmousedown = (e) => { e.preventDefault(); isResizing = true; };
        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            el.style.width = (e.clientX - el.offsetLeft) + 'px';
            el.style.height = (e.clientY - el.offsetTop) + 'px';
        });
        window.addEventListener('mouseup', () => { if (isResizing) { isResizing = false; syncState(true); } });
    }

    window.addEventListener('beforeunload', () => { if (player && player.getCurrentTime) syncState(true); });
})();
