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
            const host = document.createElement('div');
            host.id = 'heartbeat-asmr-host';
            document.body.appendChild(host);
            shadow = host.attachShadow({ mode: 'open' });
            
            // Inject Styles
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('asmr-player.css');
            shadow.appendChild(link);

            container = document.createElement('div');
            container.className = 'asmr-player-container';
            shadow.appendChild(container);

            container.innerHTML = `
                <div class="asmr-player-header">
                    <span class="asmr-title">${video.title}</span>
                    <div class="asmr-player-controls">
                        <button class="minimize-btn" title="Minimize">_</button>
                        <button class="close-btn" title="Close">×</button>
                    </div>
                </div>
                <div class="asmr-video-wrapper" id="player-target"></div>
                <div class="asmr-resize-handle"></div>
            `;

            // Setup Event Handlers
            initDraggable(container, shadow.querySelector('.asmr-player-header'));
            initResizable(container, shadow.querySelector('.asmr-resize-handle'));
            
            shadow.querySelector('.close-btn').onclick = () => {
                chrome.runtime.sendMessage({ type: 'ASMR_STOP' });
                removePlayer();
            };
            
            shadow.querySelector('.minimize-btn').onclick = () => {
                container.classList.toggle('minimized');
                syncState();
            };
        }

        // Apply Props
        container.style.left = props.x + 'px';
        container.style.top = props.y + 'px';
        container.style.width = props.width + 'px';
        container.style.height = props.height + 'px';
        if (props.isMinimized) container.classList.add('minimized');

        loadYouTubeAPI(() => {
            if (player) {
                player.loadVideoById(video.videoId, startTime);
            } else {
                player = new YT.Player(shadow.getElementById('player-target'), {
                    height: '100%',
                    width: '100%',
                    videoId: video.videoId,
                    playerVars: {
                        'autoplay': 1,
                        'controls': 1,
                        'modestbranding': 1,
                        'rel': 0,
                        'start': Math.floor(startTime)
                    },
                    events: {
                        'onReady': (event) => {
                            if (startTime > 0) event.target.seekTo(startTime);
                            startHeartbeat();
                        },
                        'onStateChange': (event) => {
                            if (event.data === YT.PlayerState.PAUSED) {
                                syncState(true); // Immediate sync on pause
                            }
                        }
                    }
                });
            }
        });
    }

    function loadYouTubeAPI(callback) {
        if (window.YT && window.YT.Player) return callback();
        
        window.onYouTubeIframeAPIReady = callback;
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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
