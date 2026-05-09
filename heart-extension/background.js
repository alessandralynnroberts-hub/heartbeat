// background.js (Dumb Background - no Firebase)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SYNC_PROGRESS') {
        // Save the progress data sent from the website
        chrome.storage.local.set({ 
            lastProgress: msg.progress,
            lastProjectName: msg.projectName,
            lastProjectId: msg.projectId
        });

        // Broadcast to all other tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id !== sender.tab?.id) { // Don't send back to the same tab
                    chrome.tabs.sendMessage(tab.id, { 
                        type: 'PROGRESS_UPDATE', 
                        progress: msg.progress,
                        projectName: msg.projectName
                    }).catch(() => {});
                }
            });
        });
    }
});
