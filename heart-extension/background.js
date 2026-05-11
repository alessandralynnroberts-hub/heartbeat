// background.js (Singleton Authority)
let asmrState = {
    activeVideo: null,
    isPlaying: false,
    currentTime: 0,
    currentTabId: null,
    volume: 100,
    playerProps: { x: 20, y: 80, width: 320, height: 180, isMinimized: false }
};

console.log("[ASMR Lifecycle] Background Service Worker Initialized");

// Initialize from storage
chrome.storage.local.get(['asmr_activeVideo', 'asmr_playerProps', 'asmr_volume'], (result) => {
    if (result.asmr_activeVideo) asmrState.activeVideo = result.asmr_activeVideo;
    if (result.asmr_playerProps) asmrState.playerProps = result.asmr_playerProps;
    if (result.asmr_volume) asmrState.volume = result.asmr_volume;
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
        const startT = performance.now();
        console.log("[ASMR Lifecycle] ASMR_PLAY requested.");
        
        stopGlobalPlayback().then(() => {
            asmrState.activeVideo = msg.video;
            asmrState.isPlaying = true;
            asmrState.currentTime = msg.startTime || 0;
            asmrState.currentTabId = sender.tab?.id || msg.tabId;
            
            chrome.storage.local.set({ asmr_activeVideo: msg.video });
            injectPlayerToTab(asmrState.currentTabId);
            console.log(`[ASMR Lifecycle] Playback initialized in ${Math.round(performance.now() - startT)}ms`);
        });
    }

    if (msg.type === 'ASMR_STOP') {
        stopGlobalPlayback();
    }

    if (msg.type === 'ASMR_HEARTBEAT') {
        asmrState.currentTime = msg.time;
        asmrState.playerProps = msg.props;
        asmrState.volume = msg.volume;
        
        if (asmrState.currentTabId !== sender.tab?.id) {
            console.warn("[ASMR Lifecycle] Orphan detected. Removing.");
            chrome.tabs.sendMessage(sender.tab.id, { type: 'ASMR_UI_REMOVE' }).catch(() => {});
        }
    }
});

async function stopGlobalPlayback() {
    if (asmrState.currentTabId) {
        try {
            const snapshot = await requestSnapshot(asmrState.currentTabId);
            if (snapshot) {
                asmrState.currentTime = snapshot.time;
                asmrState.volume = snapshot.volume;
            }
        } catch(e) {}
    }
    
    asmrState.isPlaying = false;
    asmrState.activeVideo = null;
    chrome.storage.local.remove('asmr_activeVideo');
    broadcastToTabs({ type: 'ASMR_UI_REMOVE' });
    asmrState.currentTabId = null;
}

function requestSnapshot(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_STATE_SNAPSHOT' }, (response) => {
            if (chrome.runtime.lastError || !response) resolve(null);
            else resolve(response);
        });
        setTimeout(() => resolve(null), 150); // Hard timeout for seamlessness
    });
}

// Tab Event Listeners for Ownership Transfer
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && asmrState.activeVideo && asmrState.isPlaying) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id === tabId) {
                transferOwnership(tabId);
            }
        });
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    if (asmrState.activeVideo && asmrState.isPlaying) {
        transferOwnership(activeInfo.tabId);
    }
});

async function transferOwnership(newTabId) {
    if (asmrState.currentTabId === newTabId) return;

    console.log("[ASMR Lifecycle] Starting ownership transfer...");
    const startT = performance.now();

    if (asmrState.currentTabId) {
        const snapshot = await requestSnapshot(asmrState.currentTabId);
        if (snapshot) {
            asmrState.currentTime = snapshot.time;
            asmrState.volume = snapshot.volume;
            console.log("[ASMR Lifecycle] Snapshot captured at:", asmrState.currentTime);
        }
        chrome.tabs.sendMessage(asmrState.currentTabId, { type: 'ASMR_UI_REMOVE' }).catch(() => {});
    }

    asmrState.currentTabId = newTabId;
    injectPlayerToTab(newTabId);
    console.log(`[ASMR Lifecycle] Transfer completed in ${Math.round(performance.now() - startT)}ms`);
}

function injectPlayerToTab(tabId) {
    if (!tabId) return;
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
                volume: asmrState.volume,
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
