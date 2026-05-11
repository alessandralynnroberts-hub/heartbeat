// asmr-injector.js
(function() {
    if (window.asmrPlayerInitialized) {
        console.log("[ASMR Transfer] Injector already active.");
        return;
    }
    window.asmrPlayerInitialized = true;

    let shadow = null;
    let container = null;
    let player = null;
    let heartbeatInterval = null;
    let videoData = null;
    let resumeOverlay = null;
    let failsafeTimeout = null;

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'ASMR_UI_RENDER') {
            console.log("[ASMR Transfer] RENDER received. Video:", msg.video.videoId);
            videoData = msg.video;
            renderPlayer(msg.video, msg.time, msg.volume, msg.props);
        }
        if (msg.type === 'ASMR_UI_REMOVE') {
            console.log("[ASMR Transfer] REMOVE received.");
            removePlayer();
        }
        if (msg.type === 'GET_STATE_SNAPSHOT') {
            if (player && player.getCurrentTime) {
                sendResponse({
                    time: player.getCurrentTime(),
                    volume: player.getVolume ? player.getVolume() : 100
                });
            } else {
                sendResponse(null);
            }
        }
    });

    function renderPlayer(video, startTime, volume, props) {
        let host = document.getElementById('heartbeat-asmr-host');
        if (host && container) {
            updatePlayerProps(props);
            return;
        }

        if (!container) {
            console.log("[ASMR Transfer] Initializing container...");
            host = host || document.createElement('div');
            host.id = 'heartbeat-asmr-host';
            if (!host.parentElement) document.body.appendChild(host);
            
            shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
            shadow.innerHTML = '';
            
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
                <div class="asmr-player-header" style="background:#fbbf24;color:#000;padding:4px 12px;display:flex;justify-content:space-between;cursor:move;font-weight:bold;font-size:11px;user-select:none;">
                    <span>FOCUS: ${video.title}</span>
                    <div class="asmr-player-controls">
                        <button class="minimize-btn" style="background:none;border:none;cursor:pointer;padding:0 5px;">_</button>
                        <button class="close-btn" style="background:none;border:none;cursor:pointer;padding:0 5px;">×</button>
                    </div>
                </div>
                <div class="asmr-video-wrapper" style="flex:1;background:#000;min-height:100px;position:relative;">
                    <div id="player-target" style="width:100%;height:100%;"></div>
                    <div id="resume-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fbbf24;font-family:monospace;font-size:10px;z-index:10;transition:opacity 0.5s;">
                        <div id="resume-status">RESUMING FOCUS AUDIO...</div>
                        <button id="manual-play-btn" style="display:none;margin-top:10px;background:#fbbf24;color:#000;border:none;padding:5px 10px;cursor:pointer;font-weight:bold;">CLICK TO RESUME</button>
                    </div>
                </div>
                <div class="asmr-resize-handle"></div>
            `;

            resumeOverlay = shadow.getElementById('resume-overlay');
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

        updatePlayerProps(props);

        const startSec = startTime || 0;
        const target = shadow.getElementById('player-target');

        // Failsafe Timer: 5 seconds
        if (failsafeTimeout) clearTimeout(failsafeTimeout);
        failsafeTimeout = setTimeout(() => {
            console.warn("[ASMR Transfer] Failsafe triggered. Manual intervention required.");
            const status = shadow.getElementById('resume-status');
            const btn = shadow.getElementById('manual-play-btn');
            if (status) status.innerText = "PLAYBACK STALLED";
            if (btn) {
                btn.style.display = 'block';
                btn.onclick = () => {
                    if (player && player.playVideo) player.playVideo();
                    hideOverlay();
                };
            }
        }, 5000);

        console.log("[ASMR Transfer] Attempting player creation...");
        loadYouTubeAPI(() => {
            console.log("[ASMR Transfer] API Ready. Initializing player instance.");
            player = new YT.Player(target, {
                height: '100%', width: '100%', videoId: video.videoId,
                host: 'https://www.youtube-nocookie.com',
                playerVars: { 
                    'autoplay': 1, 'controls': 1, 'start': Math.floor(startSec), 
                    'origin': window.location.origin, 'modestbranding': 1, 'rel': 0 
                },
                events: {
                    'onReady': (event) => { 
                        console.log("[ASMR Transfer] onReady fired. Seeking to:", startSec);
                        if (failsafeTimeout) clearTimeout(failsafeTimeout);
                        if (volume !== undefined) event.target.setVolume(volume);
                        event.target.seekTo(startSec, true);
                        event.target.playVideo();
                        startHeartbeat();
                    },
                    'onStateChange': (event) => { 
                        console.log("[ASMR Transfer] State change:", event.data);
                        if (event.data === YT.PlayerState.PLAYING) {
                            hideOverlay();
                        }
                        if (event.data === YT.PlayerState.PAUSED) syncState(true); 
                    },
                    'onError': (e) => {
                        console.error("[ASMR Transfer] Player Error:", e.data);
                        hideOverlay(); // Don't block user if error occurs
                    }
                }
            });
        });
    }

    function hideOverlay() {
        if (failsafeTimeout) clearTimeout(failsafeTimeout);
        if (resumeOverlay) {
            resumeOverlay.style.opacity = '0';
            setTimeout(() => { if (resumeOverlay) resumeOverlay.style.display = 'none'; }, 500);
        }
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
            volume: player.getVolume ? player.getVolume() : 100,
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
        if (failsafeTimeout) clearTimeout(failsafeTimeout);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (player) { try { player.destroy(); } catch(e) {} }
        const host = document.getElementById('heartbeat-asmr-host');
        if (host) host.remove();
        container = null;
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
