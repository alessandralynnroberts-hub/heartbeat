// asmr-injector.js
(function() {
    if (window.asmrPlayerInitialized) return;
    window.asmrPlayerInitialized = true;

    let shadow = null;
    let container = null;
    let player = null;
    let lastTime = 0;
    let heartbeatInterval = null;
    let videoData = null;

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'ASMR_UI_RENDER') {
            videoData = msg.video;
            renderPlayer(msg.video, msg.time, msg.props);
        }
        if (msg.type === 'ASMR_UI_REMOVE') {
            removePlayer();
        }
    });

    function renderPlayer(video, startTime, props) {
        if (!container) {
            const host = document.getElementById('heartbeat-asmr-host') || document.createElement('div');
            host.id = 'heartbeat-asmr-host';
            if (!host.parentElement) document.body.appendChild(host);
            
            shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
            shadow.innerHTML = ''; // Clear previous
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('asmr-player.css');
            shadow.appendChild(link);

            container = document.createElement('div');
            container.className = 'asmr-player-container';
            // Force visibility styles in case CSS fails to load
            container.style.cssText = `
                position: fixed; background: #000; border: 2px solid #fbbf24;
                z-index: 2147483647; display: flex; flex-direction: column;
                box-shadow: 10px 10px 0px #000; overflow: hidden;
            `;
            shadow.appendChild(container);

            container.innerHTML = `
                <div class="asmr-player-header" style="background:#fbbf24;color:#000;padding:4px 12px;display:flex;justify-content:space-between;cursor:move;font-weight:bold;">
                    <span>FOCUS: ${video.title}</span>
                    <div class="asmr-player-controls">
                        <button class="minimize-btn">_</button>
                        <button class="close-btn">×</button>
                    </div>
                </div>
                <div class="asmr-video-wrapper" id="player-target" style="flex:1;background:#000;min-height:100px;"></div>
                <div class="asmr-resize-handle"></div>
            `;

            initDraggable(container, shadow.querySelector('.asmr-player-header'));
            initResizable(container, shadow.querySelector('.asmr-resize-handle'));
            
            shadow.querySelector('.close-btn').onclick = () => {
                chrome.runtime.sendMessage({ type: 'ASMR_STOP' });
                removePlayer();
            };
            
            shadow.querySelector('.minimize-btn').onclick = () => {
                container.classList.toggle('minimized');
                syncState(true);
            };
        }

        const p = props || { x: 20, y: 80, width: 320, height: 180 };
        container.style.left = p.x + 'px';
        container.style.top = p.y + 'px';
        container.style.width = p.width + 'px';
        container.style.height = p.height + 'px';
        if (p.isMinimized) container.classList.add('minimized');

        const startSec = Math.floor(startTime || 0);
        const target = shadow.getElementById('player-target');

        // Immediate direct iframe fallback for robustness
        target.innerHTML = `<iframe 
            src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&start=${startSec}&rel=0&modestbranding=1" 
            style="width:100%;height:100%;border:none;" 
            allow="autoplay; encrypted-media" 
            allowfullscreen>
        </iframe>`;

        // Attempt advanced JS API for timestamp tracking
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
                        'onStateChange': (event) => { if (event.data === YT.PlayerState.PAUSED) syncState(true); }
                    }
                });
            }
        });
    }


    function loadYouTubeAPI(callback) {
        if (window.YT && window.YT.Player) return callback();
        
        // Handle multiple calls while loading
        const existingCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (existingCallback) existingCallback();
            callback();
        };

        if (!document.getElementById('yt-iframe-api')) {
            const tag = document.createElement('script');
            tag.id = 'yt-iframe-api';
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.head.appendChild(tag);
            }
        }
    }

    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            syncState();
        }, 10000); // Throttled 10s
    }

    function syncState(immediate = false) {
        if (!player || !player.getCurrentTime) return;
        const currentTime = player.getCurrentTime();
        
        chrome.runtime.sendMessage({
            type: 'ASMR_HEARTBEAT',
            time: currentTime,
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
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (player) player.destroy();
        const host = document.getElementById('heartbeat-asmr-host');
        if (host) host.remove();
        container = null;
        player = null;
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
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';
                syncState(true);
            }
        });
    }

    function initResizable(el, handle) {
        let isResizing = false;

        handle.onmousedown = (e) => {
            e.preventDefault();
            isResizing = true;
        };

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            el.style.width = (e.clientX - el.offsetLeft) + 'px';
            el.style.height = (e.clientY - el.offsetTop) + 'px';
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                syncState(true);
            }
        });
    }

    // Sync on unload
    window.addEventListener('beforeunload', () => {
        if (player && player.getCurrentTime) {
            syncState(true);
        }
    });

})();
