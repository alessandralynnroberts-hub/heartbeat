// background.js (Central Coordinator)
let asmrState = {
    activeVideo: null,
    isPlaying: false,
    currentTime: 0,
    playerProps: { x: 20, y: 80, width: 320, height: 180, isMinimized: false }
};

// Initialize from storage
chrome.storage.local.get(['asmr_activeVideo', 'asmr_playerProps'], (result) => {
    if (result.asmr_activeVideo) asmrState.activeVideo = result.asmr_activeVideo;
    if (result.asmr_playerProps) asmrState.playerProps = result.asmr_playerProps;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SYNC_PROGRESS') {
        chrome.storage.local.set({ 
            lastProgress: msg.progress,
            lastProjectName: msg.projectName,
            lastProjectId: msg.projectId
        });

        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id !== sender.tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { 
                        type: 'PROGRESS_UPDATE', 
                        progress: msg.progress,
                        projectName: msg.projectName
                    }).catch(() => {});
                }
            });
        });
    }

    if (msg.type === 'ASMR_PLAY') {
        asmrState.activeVideo = msg.video;
        asmrState.isPlaying = true;
        asmrState.currentTime = msg.startTime || 0;
        chrome.storage.local.set({ asmr_activeVideo: msg.video });
        injectPlayerToTab(sender.tab?.id || msg.tabId);
    }

    if (msg.type === 'ASMR_STOP') {
        asmrState.isPlaying = false;
        asmrState.activeVideo = null;
        chrome.storage.local.remove('asmr_activeVideo');
        broadcastToTabs({ type: 'ASMR_UI_REMOVE' });
    }

    if (msg.type === 'ASMR_HEARTBEAT') {
        asmrState.currentTime = msg.time;
        asmrState.playerProps = msg.props;
        // Throttled persistence handled by caller or periodically here if needed
    }
});

// Tab Event Listeners for Reconstruction
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && asmrState.activeVideo && asmrState.isPlaying) {
        injectPlayerToTab(tabId);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    if (asmrState.activeVideo && asmrState.isPlaying) {
        injectPlayerToTab(activeInfo.tabId);
    }
});

function injectPlayerToTab(tabId) {
    if (!tabId) return;
    
    // Ensure we don't inject into restricted pages (chrome://, etc.)
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab.url || tab.url.startsWith('chrome://')) return;

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['asmr-injector.js']
        }).then(() => {
            chrome.tabs.sendMessage(tabId, {
                type: 'ASMR_UI_RENDER',
                video: asmrState.activeVideo,
                time: asmrState.currentTime,
                props: asmrState.playerProps
            }).catch(() => {});
        });
    });
}

function broadcastToTabs(msg) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
        });
    });
}
