// player.js
let player = null;
let heartbeatInterval = null;
let failsafeTimeout = null;

console.log("[ASMR Player] Initializing...");

// Initialize from Background state
chrome.runtime.sendMessage({ type: 'GET_ASMR_STATE' }, (state) => {
    console.log("[ASMR Player] State received:", state);
    if (state && state.activeVideo) {
        initPlayer(state.activeVideo, state.currentTime, state.volume);
    } else {
        document.getElementById('video-title').innerText = "NO VIDEO SELECTED";
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PLAYER_LOAD_VIDEO') {
        console.log("[ASMR Player] LOAD_VIDEO received:", msg.video.videoId);
        initPlayer(msg.video, msg.time);
    }
});

function initPlayer(video, startTime, volume) {
    document.getElementById('video-title').innerText = video.title.toUpperCase();
    const target = document.getElementById('player-target');
    const startSec = Math.floor(startTime || 0);

    // Failsafe: Remove overlay after 5s no matter what
    if (failsafeTimeout) clearTimeout(failsafeTimeout);
    failsafeTimeout = setTimeout(() => {
        console.warn("[ASMR Player] Failsafe triggered.");
        hideOverlay();
    }, 5000);

    // 1. Immediate Iframe Rendering (Robust)
    target.innerHTML = `<iframe 
        id="yt-iframe"
        src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&start=${startSec}&rel=0&modestbranding=1&enablejsapi=1" 
        style="width:100%;height:100%;border:none;" 
        allow="autoplay; encrypted-media" 
        allowfullscreen>
    </iframe>`;

    // 2. Attempt JS API for heartbeats/sync
    loadYouTubeAPI(() => {
        console.log("[ASMR Player] API Ready. Linking to iframe...");
        player = new YT.Player('yt-iframe', {
            events: {
                'onReady': (event) => {
                    console.log("[ASMR Player] onReady fired.");
                    if (volume !== undefined) event.target.setVolume(volume);
                    hideOverlay();
                    startHeartbeat();
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        hideOverlay();
                    }
                }
            }
        });
    });
}

function hideOverlay() {
    if (failsafeTimeout) clearTimeout(failsafeTimeout);
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);
    }
}

function loadYouTubeAPI(callback) {
    if (window.YT && window.YT.Player) return callback();
    window.onYouTubeIframeAPIReady = callback;
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        if (player && player.getCurrentTime) {
            chrome.runtime.sendMessage({
                type: 'ASMR_HEARTBEAT',
                time: player.getCurrentTime(),
                volume: player.getVolume ? player.getVolume() : 100
            });
        }
    }, 5000);
}
