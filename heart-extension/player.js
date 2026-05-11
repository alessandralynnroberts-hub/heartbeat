// player.js - Simple, robust iframe player
console.log("[ASMR Player] Script loaded.");

window.addEventListener('DOMContentLoaded', () => {
    console.log("[ASMR Player] DOM ready. Requesting state...");

    chrome.runtime.sendMessage({ type: 'GET_ASMR_STATE' }, (state) => {
        if (chrome.runtime.lastError) {
            console.error("[ASMR Player] Messaging error:", chrome.runtime.lastError);
            return;
        }
        console.log("[ASMR Player] State:", state);
        if (state && state.activeVideo) {
            renderIframe(state.activeVideo, state.currentTime);
        } else {
            document.getElementById('video-title').innerText = "NO VIDEO SELECTED";
        }
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'PLAYER_LOAD_VIDEO') {
            console.log("[ASMR Player] Load video:", msg.video.videoId);
            renderIframe(msg.video, msg.time || 0);
        }
    });
});

function renderIframe(video, startTime) {
    const startSec = Math.floor(startTime || 0);
    document.getElementById('video-title').innerText = video.title.toUpperCase();
    console.log("[ASMR Player] Rendering:", video.videoId, "at", startSec);

    const wrapper = document.getElementById('player-wrapper');
    wrapper.innerHTML = `<iframe
        src="https://www.youtube.com/embed/${video.videoId}?autoplay=1&start=${startSec}&rel=0&modestbranding=1"
        allow="autoplay; encrypted-media"
        allowfullscreen>
    </iframe>`;
}
