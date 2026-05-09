// Heartbeat Extension Popup Logic

const slider = document.getElementById('size-slider');
const sizeDisplay = document.getElementById('current-size');

// Initialize from storage
chrome.storage.sync.get(['heartSize'], (result) => {
    if (result.heartSize) {
        slider.value = result.heartSize;
        sizeDisplay.textContent = result.heartSize;
    }
});

slider.addEventListener('input', (e) => {
    const size = e.target.value;
    sizeDisplay.textContent = size;
    
    // Save to storage
    chrome.storage.sync.set({ heartSize: size });

    // Send message to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSize', size: size });
        }
    });

    // Also send to all tabs to keep it consistent
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'updateSize', size: size });
        });
    });
});
