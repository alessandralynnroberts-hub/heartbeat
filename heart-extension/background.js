// background.js (Singleton Authority)
let asmrState = {
    activeVideo: null,
    isPlaying: false,
    currentTime: 0,
    currentTabId: null,
    playerProps: { x: 20, y: 80, width: 320, height: 180, isMinimized: false }
};

console.log("[ASMR Lifecycle] Background Service Worker Initialized");

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

        broadcastToTabs({ 
            type: 'PROGRESS_UPDATE', 
            progress: msg.progress,
            projectName: msg.projectName
        }, sender.tab?.id);
    }

    if (msg.type === 'ASMR_PLAY') {
        console.log("[ASMR Lifecycle] ASMR_PLAY requested for video:", msg.video.videoId);
        
        // SINGLETON ENFORCEMENT: Stop any existing player first
        stopGlobalPlayback();

        asmrState.activeVideo = msg.video;
        asmrState.isPlaying = true;
        asmrState.currentTime = msg.startTime || 0;
        asmrState.currentTabId = sender.tab?.id || msg.tabId;
        
        chrome.storage.local.set({ asmr_activeVideo: msg.video });
        injectPlayerToTab(asmrState.currentTabId);
    }

    if (msg.type === 'ASMR_STOP') {
        console.log("[ASMR Lifecycle] ASMR_STOP requested");
        stopGlobalPlayback();
    }

    if (msg.type === 'ASMR_HEARTBEAT') {
        asmrState.currentTime = msg.time;
        asmrState.playerProps = msg.props;
        // Check if the sender is actually the owner
        if (asmrState.currentTabId !== sender.tab?.id) {
            console.warn("[ASMR Lifecycle] Heartbeat received from non-owner tab. Destroying orphaned player.");
            chrome.tabs.sendMessage(sender.tab.id, { type: 'ASMR_UI_REMOVE' }).catch(() => {});
        }
    }
});

function stopGlobalPlayback() {
    asmrState.isPlaying = false;
    asmrState.activeVideo = null;
    chrome.storage.local.remove('asmr_activeVideo');
    broadcastToTabs({ type: 'ASMR_UI_REMOVE' });
    asmrState.currentTabId = null;
}

// Tab Event Listeners for Ownership Transfer
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && asmrState.activeVideo && asmrState.isPlaying) {
        // Only re-inject if it's the active tab and it's our "new" owner
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id === tabId) {
                console.log("[ASMR Lifecycle] Navigation detected on active tab. Re-constructing player.");
                transferOwnership(tabId);
            }
        });
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    if (asmrState.activeVideo && asmrState.isPlaying) {
        console.log("[ASMR Lifecycle] Tab switch detected. Moving ownership to:", activeInfo.tabId);
        transferOwnership(activeInfo.tabId);
    }
});

function transferOwnership(newTabId) {
    if (asmrState.currentTabId && asmrState.currentTabId !== newTabId) {
        chrome.tabs.sendMessage(asmrState.currentTabId, { type: 'ASMR_UI_REMOVE' }).catch(() => {});
    }
    asmrState.currentTabId = newTabId;
    injectPlayerToTab(newTabId);
}

function injectPlayerToTab(tabId) {
    if (!tabId) return;
    
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab.url || tab.url.startsWith('chrome://')) return;

        console.log("[ASMR Lifecycle] Injecting injector.js to tab:", tabId);
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

function broadcastToTabs(msg, excludeTabId = null) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id !== excludeTabId) {
                chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
            }
        });
    });
}
