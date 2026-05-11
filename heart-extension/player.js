// player.js
let player = null;
let currentVideo = null;
let heartbeatInterval = null;

// Initialize from Background state
chrome.runtime.sendMessage({ type: 'GET_ASMR_STATE' }, (state) => {
    if (state && state.activeVideo) {
        initPlayer(state.activeVideo, state.currentTime, state.volume);
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PLAYER_LOAD_VIDEO') {
        initPlayer(msg.video, msg.time);
    }
});

function initPlayer(video, startTime, volume) {
    currentVideo = video;
    document.getElementById('video-title').innerText = video.title.toUpperCase();
    
    loadYouTubeAPI(() => {
        if (player && player.loadVideoById) {
            player.loadVideoById(video.videoId, startTime || 0);
        } else {
            const target = document.getElementById('player-target');
            player = new YT.Player(target, {
                height: '100%',
                width: '100%',
                videoId: video.videoId,
                host: 'https://www.youtube-nocookie.com',
                playerVars: {
                    'autoplay': 1,
                    'controls': 1,
                    'start': Math.floor(startTime || 0),
                    'origin': window.location.origin,
                    'modestbranding': 1,
                    'rel': 0
                },
                events: {
                    'onReady': (event) => {
                        if (volume !== undefined) event.target.setVolume(volume);
                        document.getElementById('loading-overlay').style.opacity = '0';
                        setTimeout(() => document.getElementById('loading-overlay').style.display = 'none', 500);
                        startHeartbeat();
                    },
                    'onStateChange': (event) => {
                        if (event.data === YT.PlayerState.PLAYING) {
                            document.getElementById('loading-overlay').style.opacity = '0';
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
