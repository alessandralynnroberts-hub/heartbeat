// background.js (Singleton Persistent Controller)
let asmrState = {
    activeVideo: null,
    isPlaying: false,
    currentTime: 0,
    volume: 100,
    playerWindowId: null
};

console.log("[ASMR Lifecycle] Background Service Worker Initialized (Persistent Mode)");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SYNC_PROGRESS') {
        chrome.storage.local.set({ 
            lastProgress: msg.progress,
            lastProjectName: msg.projectName,
            lastProjectId: msg.projectId
        });

        broadcastToTabs({ 
            type: 'PROGRESS_UPDATE', 
            progress: msg.progress,
            projectName: msg.projectName
        }, sender.tab?.id);
    }

    if (msg.type === 'ASMR_PLAY') {
        console.log("[ASMR Lifecycle] ASMR_PLAY requested.");
        asmrState.activeVideo = msg.video;
        asmrState.isPlaying = true;
        asmrState.currentTime = msg.startTime || 0;
        
        ensurePlayerWindowOpen();
    }

    if (msg.type === 'ASMR_STOP') {
        console.log("[ASMR Lifecycle] ASMR_STOP requested.");
        stopGlobalPlayback();
    }

    if (msg.type === 'ASMR_HEARTBEAT') {
        asmrState.currentTime = msg.time;
        asmrState.volume = msg.volume;
    }

    if (msg.type === 'GET_ASMR_STATE') {
        sendResponse(asmrState);
    }
});

function ensurePlayerWindowOpen() {
    if (asmrState.playerWindowId) {
        chrome.windows.get(asmrState.playerWindowId, (win) => {
            if (chrome.runtime.lastError || !win) {
                createPlayerWindow();
            } else {
                chrome.windows.update(asmrState.playerWindowId, { focused: true });
                // Notify the existing window to play the new video
                chrome.runtime.sendMessage({
                    type: 'PLAYER_LOAD_VIDEO',
                    video: asmrState.activeVideo,
                    time: asmrState.currentTime
                }).catch(() => {});
            }
        });
    } else {
        createPlayerWindow();
    }
}

function createPlayerWindow() {
    const width = 360;
    const height = 240;
    
    chrome.windows.create({
        url: chrome.runtime.getURL('player.html'),
        type: 'popup',
        width: width,
        height: height,
        top: 100,
        left: 100
    }, (win) => {
        asmrState.playerWindowId = win.id;
    });
}

function stopGlobalPlayback() {
    asmrState.isPlaying = false;
    asmrState.activeVideo = null;
    if (asmrState.playerWindowId) {
        chrome.windows.remove(asmrState.playerWindowId).catch(() => {});
        asmrState.playerWindowId = null;
    }
}

// Watch for window close
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === asmrState.playerWindowId) {
        asmrState.playerWindowId = null;
        asmrState.isPlaying = false;
        console.log("[ASMR Lifecycle] Player window closed.");
    }
});

function broadcastToTabs(msg, excludeTabId = null) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id !== excludeTabId) {
                chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
            }
        });
    });
}
