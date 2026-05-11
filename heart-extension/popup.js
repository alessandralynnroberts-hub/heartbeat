// popup.js
const sizeRange = document.getElementById('sizeRange');
const sizeValue = document.getElementById('sizeValue');
const projectListEl = document.getElementById('project-list');

// 1. Handle Heart Size
chrome.storage.local.get(['heartSize'], (data) => {
    if (data.heartSize) {
        sizeRange.value = data.heartSize;
        sizeValue.innerText = data.heartSize;
    }
});

sizeRange.addEventListener('input', (e) => {
    const size = e.target.value;
    sizeValue.innerText = size;
    chrome.storage.local.set({ heartSize: size });
});

// 2. Initial Fetch
function initSync() {
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) { /* already initialized */ }
    
    const db = firebase.firestore();

    chrome.storage.local.get(['heartbeat_uid', 'heartbeat_email', 'lastProjectId'], (data) => {
        if (data.heartbeat_uid) {
            fetchProjects(db, data.heartbeat_uid, data.heartbeat_email, data.lastProjectId);
        } else {
            projectListEl.innerHTML = `
                <div style="font-size: 0.7rem; color: #666; padding: 10px; text-align: center;">
                    <p>Website login not detected.</p>
                    <button id="manual-sync-btn" style="background: #fbbf24; border: none; color: #000; padding: 5px 10px; cursor: pointer; margin-top: 5px; font-family: inherit; font-weight: bold;">TRY SYNC</button>
                </div>
            `;
            const btn = document.getElementById('manual-sync-btn');
            if (btn) btn.onclick = () => {
                btn.innerText = "Syncing...";
                setTimeout(initSync, 500);
            };
        }
    });
}

function fetchProjects(db, uid, email, activeId) {
    const ownedQuery = db.collection("vault_projects").where("userId", "==", uid).get();
    
    let queries = [ownedQuery];
    if (email) {
        queries.push(db.collection("vault_projects").where("sharedWith", "array-contains", email).get());
    }

    Promise.all(queries)
        .then((snapshots) => {
            projectListEl.innerHTML = '';
            const allDocs = new Map(); // Use Map to avoid duplicates

            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    allDocs.set(doc.id, doc.data());
                });
            });

            if (allDocs.size === 0) {
                projectListEl.innerHTML = '<div style="font-size: 0.7rem; color: #666; padding: 10px;">No projects found.</div>';
                return;
            }

            allDocs.forEach((project, id) => {
                const item = document.createElement('div');
                item.className = 'project-item' + (activeId === id ? ' active' : '');
                
                const isShared = project.userId !== uid;
                item.innerHTML = `
                    ${project.name} 
                    ${isShared ? '<span style="font-size: 0.6rem; color: #fbbf24; opacity: 0.8; margin-left: 5px;">(SHARED)</span>' : ''}
                `;
                
                item.onclick = () => activateFromPopup(id, project.name, project.tasks);
                projectListEl.appendChild(item);
            });
        })
        .catch(err => {
            console.error(err);
            projectListEl.innerHTML = '<div style="font-size: 0.7rem; color: #ef4444; padding: 10px;">Error syncing.</div>';
        });
}

function activateFromPopup(id, name, tasks) {
    let total = 0; let completed = 0;
    (tasks || []).forEach(t => {
        total++; if (t.completed) completed++;
        if (t.subtasks) t.subtasks.forEach(st => { total++; if (st.completed) completed++; });
    });
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Save to storage
    chrome.storage.local.set({ 
        lastProjectId: id,
        lastProjectName: name,
        lastProgress: progress
    }, () => {
        // Broadcast to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SYNC_PROGRESS',
                    progress: progress,
                    projectName: name,
                    projectId: id
                }).catch(err => { /* ignore tabs without extension script */ });
            });
        });

        // Update UI in popup
        const items = document.querySelectorAll('.project-item');
        items.forEach(item => {
            const itemName = item.innerText.split('(SHARED)')[0].trim();
            item.classList.toggle('active', itemName === name);
        });
    });
}

// 3. ASMR Library Sync
const asmrListEl = document.getElementById('asmr-list');

function initASMRSync() {
    chrome.storage.local.get(['asmr_library'], (data) => {
        renderASMRLibrary(data.asmr_library || []);
    });
}

function renderASMRLibrary(videos) {
    if (!asmrListEl) return;
    if (videos.length === 0) {
        asmrListEl.innerHTML = '<div style="font-size: 0.7rem; color: #666; padding: 10px;">Add videos on website...</div>';
        return;
    }

    asmrListEl.innerHTML = '';
    videos.forEach(video => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 32px; height: 18px; background-image: url('${video.thumbnail}'); background-size: cover; border: 1px solid #333;"></div>
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${video.title}</div>
            </div>
        `;
        item.onclick = () => {
            chrome.runtime.sendMessage({
                type: 'ASMR_PLAY',
                video: video,
                startTime: 0
            });
            window.close(); // Close popup after selection
        };
        asmrListEl.appendChild(item);
    });
}

// Listen for library updates
chrome.storage.onChanged.addListener((changes) => {
    if (changes.asmr_library) {
        renderASMRLibrary(changes.asmr_library.newValue || []);
    }
});

initSync();
initASMRSync();
