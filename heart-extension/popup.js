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

    chrome.storage.local.get(['heartbeat_uid', 'lastProjectId'], (data) => {
        if (data.heartbeat_uid) {
            fetchProjects(db, data.heartbeat_uid, data.lastProjectId);
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

function fetchProjects(db, uid, activeId) {
    db.collection("vault_projects")
        .where("userId", "==", uid)
        .get()
        .then((snapshot) => {
            projectListEl.innerHTML = '';
            if (snapshot.empty) {
                projectListEl.innerHTML = '<div style="font-size: 0.7rem; color: #666; padding: 10px;">No projects found.</div>';
                return;
            }

            snapshot.forEach((doc) => {
                const project = doc.data();
                const item = document.createElement('div');
                item.className = 'project-item' + (activeId === doc.id ? ' active' : '');
                item.innerText = project.name;
                item.onclick = () => activateFromPopup(doc.id, project.name, project.tasks);
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
        items.forEach(item => item.classList.toggle('active', item.innerText === name));
    });
}

initSync();
