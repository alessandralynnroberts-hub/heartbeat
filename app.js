/* DOM Elements */
const globalLoading = document.getElementById('global-loading');
const dashboardView = document.getElementById('dashboard-view');
const workspaceView = document.getElementById('workspace-view');

const projectsGrid = document.getElementById('projects-grid');
const addProjectBtn = document.getElementById('add-project-btn');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel = document.getElementById('modal-cancel');
const modalCreate = document.getElementById('modal-create');
const newProjectName = document.getElementById('new-project-name');
const newProjectType = document.getElementById('new-project-type');

const duplicateModalOverlay = document.getElementById('duplicate-modal-overlay');
const duplicateProjectName = document.getElementById('duplicate-project-name');
const duplicateCopyFiles = document.getElementById('duplicate-copy-files');
const duplicateModalCancel = document.getElementById('duplicate-modal-cancel');
const duplicateModalCreate = document.getElementById('duplicate-modal-create');

// Workspace Elements
const backBtn = document.getElementById('back-btn');
const workspaceTitle = document.getElementById('workspace-title');
const workspaceTypeBadge = document.getElementById('workspace-type-badge');
const workspaceDuplicateBtn = document.getElementById('workspace-duplicate-btn');
const achievementBar = document.getElementById('achievement-bar');

const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const tasksListEl = document.getElementById('tasks-list');

// File Upload Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const filesList = document.getElementById('files-list');
const fileCount = document.getElementById('file-count');
const emptyAssetsState = document.getElementById('empty-assets-state');

const progressContainer = document.getElementById('upload-progress-container');
const progressBar = document.getElementById('progress-bar');
const progressFilename = document.getElementById('upload-filename');
const progressPercentage = document.getElementById('upload-percentage');

/* Database Collections */
const PROJECTS_COLLECTION = "vault_projects";
const FILES_COLLECTION = "vault_files";

const socialGrid = document.getElementById('social-grid');
const myProjectsContainer = document.getElementById('my-projects-container');
const socialProjectsContainer = document.getElementById('social-projects-container');
const tabMyProjects = document.getElementById('tab-my-projects');
const tabSocial = document.getElementById('tab-social');

const shareModalOverlay = document.getElementById('share-modal-overlay');
const shareEmailInput = document.getElementById('share-email');
const shareModalCancel = document.getElementById('share-modal-cancel');
const shareModalSend = document.getElementById('share-modal-send');

let socialProjectsUnsubscribe = null;
let socialProjectsArray = [];
let shareProjectId = null;

// Scroll Observer for Brutalist Animations
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

/* State Configuration */
let currentUser = null;
let currentProjectId = null;
let currentProjectData = null;
let projectsUnsubscribe = null;
let filesUnsubscribe = null;
let projectDocUnsubscribe = null;
let dragSourceIndex = null;
let allProjectsArray = [];
let dragSourceProjectIndex = null;
let sessionThoughts = []; // Store thoughts in memory only

/* Scroll Engine */

const taskTemplates = {
    script: ["Concept Outline", "Character Bios", "First Draft", "Revisions & Edits", "Final Polish", "Formatting"],
    film: ["Screenwriting", "Storyboarding", "Casting & Auditions", "Location Scouting", "Pre-Production Planning", "Principal Photography", "Audio Editing", "Video Editing", "Color Grading", "Final Cut & Distribution"],
    photography: ["Concept & Planning", "Location Scouting", "Shoot Setup & Lighting", "Photo Session", "Selecting Best Shots", "Retouching & Editing", "Final Export & Delivery"],
    'visual-art': ["Concept & Sketching", "Canvas Preparation", "Underpainting", "Primary Colors & Blocking In", "Detailing & Texturing", "Refining & Highlights", "Varnishing & Finishing"],
    animation: ["Concept Design", "Storyboarding", "Animatic Production", "Character Modeling / Rigging", "Keyframe Animation", "In-betweening", "Lighting & Rendering", "Compositing & Effects", "Audio Syncing", "Final Export"],
    novel: ["Brainstorming & Outline", "Worldbuilding", "Character Development", "First Draft - Act I", "First Draft - Act II", "First Draft - Act III", "Developmental Edits", "Line Edits", "Proofreading", "Final Polish"],
    'game-design': ["Game Concept & Pitch", "Core Mechanics Design", "Concept Art & Moodboards", "Prototyping", "Asset Creation (Models/Sprites/Audio)", "Level Design", "Programming & Scripting", "Playtesting & Balancing", "Bug Fixing & Polish", "Release & Publishing"]
};

// Listen for connection / Fetch initial data
document.addEventListener("DOMContentLoaded", () => {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        globalLoading.innerHTML = `
            <div style="color: var(--error); margin-bottom: 8px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <p><strong>Configuration Missing</strong></p>
            <p style="font-size: 0.9rem; margin-top: 4px;">Please add your Firebase credentials to <code>firebase-config.js</code></p>
        `;
        return;
    }
    initApp();
    checkExtensionStatus();
    try {
        if (typeof initASMR === 'function') initASMR();
    } catch (e) { console.error("ASMR Init Error:", e); }
});

function checkExtensionStatus() {
    const statusBtn = document.getElementById('extension-status-btn');
    const statusText = statusBtn.querySelector('.status-text');
    
    // Check for the attribute injected by the extension's content script
    const isActive = document.documentElement.getAttribute('data-antigravity-heart-active') === 'true';
    const hasUID = !!document.documentElement.getAttribute('data-heartbeat-uid');
    
    if (isActive) {
        statusBtn.classList.add('active');
        statusBtn.classList.remove('missing');
        statusText.innerText = hasUID ? 'SYNCED & ACTIVE' : 'HEARTBEAT ACTIVE (WAITING FOR SYNC)';
    } else {
        // Try again in a second
        setTimeout(checkExtensionStatus, 1500);
    }
}

document.getElementById('extension-status-btn').addEventListener('click', () => {
    const isActive = document.documentElement.getAttribute('data-antigravity-heart-active') === 'true';
    if (!isActive) {
        alert("Heartbeat Extension Not Found!\n\nTo enable it:\n1. Download the extension folder.\n2. Go to chrome://extensions/\n3. Turn on Developer Mode.\n4. Click 'Load unpacked' and select the folder.");
    } else {
        alert("Heartbeat Extension is active and pumping! ❤️");
    }
});

function initApp() {
    // Listen for Auth State
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('sign-in-btn').classList.add('hidden');
            document.getElementById('user-profile').classList.remove('hidden');
            document.getElementById('user-email').innerText = user.email;
            
            // Sync with extension
            try {
                document.documentElement.setAttribute('data-heartbeat-uid', user.uid);
                document.documentElement.setAttribute('data-heartbeat-email', user.email);
            } catch (e) { console.error("Sync error", e); }

            globalLoading.classList.add('hidden');
            showDashboard();
            fetchProjects();
        } else {
            currentUser = null;
            document.getElementById('sign-in-btn').classList.remove('hidden');
            document.getElementById('user-profile').classList.add('hidden');
            
            projectsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>Please Sign In to view your projects.</p>
                </div>
            `;
            dashboardView.classList.remove('hidden');
            globalLoading.classList.add('hidden');
        }
    });
}

// Auth Handlers
document.getElementById('sign-in-btn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert("Sign-in failed: " + err.message));
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
    auth.signOut();
});

/* Routing / Views */
function showDashboard() {
    workspaceView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    currentProjectId = null;
    currentProjectData = null;
    
    // Reset tabs
    tabMyProjects.click();

    if (filesUnsubscribe) filesUnsubscribe();
    if (projectDocUnsubscribe) projectDocUnsubscribe();
}

tabMyProjects.addEventListener('click', () => {
    tabMyProjects.classList.add('active');
    tabSocial.classList.remove('active');
    myProjectsContainer.classList.remove('hidden');
    socialProjectsContainer.classList.add('hidden');
});

tabSocial.addEventListener('click', () => {
    tabSocial.classList.add('active');
    tabMyProjects.classList.remove('active');
    socialProjectsContainer.classList.remove('hidden');
    myProjectsContainer.classList.add('hidden');
    fetchSocialProjects();
});

function fetchSocialProjects() {
    if (!currentUser) return;
    
    if (socialProjectsUnsubscribe) socialProjectsUnsubscribe();

    socialProjectsUnsubscribe = db.collection(PROJECTS_COLLECTION)
        .where("sharedWith", "array-contains", currentUser.email)
        .onSnapshot((snapshot) => {
            socialGrid.innerHTML = '';
            
            if (snapshot.empty) {
                socialGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <p>No projects shared with you yet. Invite your friends to Heartbeat!</p>
                    </div>
                `;
                return;
            }

            snapshot.forEach((doc) => {
                renderSocialProjectCard(doc.data(), doc.id);
            });
        });
}

function openWorkspace(projectId) {
    currentProjectId = projectId;
    dashboardView.classList.add('hidden');
    workspaceView.classList.remove('hidden');
    
    // Subscribe to specific project changes
    projectDocUnsubscribe = db.collection(PROJECTS_COLLECTION).doc(projectId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                currentProjectData = doc.data();
                renderWorkspaceHeader();
                renderTasks();
                renderGhostThoughts();
                syncWithExtension(currentProjectData.tasks);
            } else {
                showDashboard();
            }
        });
}

backBtn.addEventListener('click', showDashboard);

/* Dashboard & Projects Logic */
function fetchProjects() {
    if (!currentUser) return;
    
    projectsUnsubscribe = db.collection(PROJECTS_COLLECTION)
        .where("userId", "==", currentUser.uid)
        .onSnapshot((snapshot) => {
            projectsGrid.innerHTML = '';
            
            if (snapshot.empty) {
                projectsGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <p>No projects found. Create one to get started!</p>
                    </div>
                `;
                return;
            }

            allProjectsArray = [];
            snapshot.forEach((doc) => {
                allProjectsArray.push({ id: doc.id, ...doc.data() });
            });
            
            // Client-Side Sort dynamically bypassing default Creation Timestamp
            allProjectsArray.sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                if (a.order !== undefined) return -1;
                if (b.order !== undefined) return 1;
                
                const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            allProjectsArray.forEach((data, index) => {
                renderProjectCard(data, data.id, index);
            });
        });
}

function renderProjectCard(data, docId, index) {
    const card = document.createElement('div');
    card.className = 'project-card scroll-reveal';
    
    card.draggable = true;
    card.dataset.index = index;
    
    card.addEventListener('click', (e) => {
        if (e.target.closest('.activate-btn') || e.target.closest('.icon-btn')) return;
        openWorkspace(docId);
    });
    
    card.addEventListener('dragstart', handleProjectDragStart);
    card.addEventListener('dragover', handleProjectDragOver);
    card.addEventListener('dragenter', handleProjectDragEnter);
    card.addEventListener('dragleave', handleProjectDragLeave);
    card.addEventListener('dragend', handleProjectDragEnd);
    card.addEventListener('drop', handleProjectDrop);
    
    let progress = 0;
    if (data.tasks && data.tasks.length > 0) {
        const completed = data.tasks.filter(t => t.completed).length;
        progress = Math.round((completed / data.tasks.length) * 100);
    }
    
    card.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items:flex-start;">
            <h3>${data.name}</h3>
            <div style="display:flex; gap: 8px;">
                <button class="share-btn" onclick="openShareModal(event, '${docId}')">SHARE</button>
                <button class="icon-btn" onclick="openDuplicateModal(event, '${docId}', '${data.name.replace(/'/g, "\\'")}', '${data.type}', '${encodeURIComponent(JSON.stringify(data.tasks))}')" title="Duplicate Project">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
        </div>
        <p>${data.type}</p>
        <div class="card-meta">
            <span>${data.tasks ? data.tasks.length : 0} tasks</span>
            <span style="color: #fbbf24">${progress}% Complete</span>
        </div>
        <div class="card-progress-bar" style="margin-top: 20px;">
            <div class="card-progress-fill" style="width: ${progress}%"></div>
        </div>
        <button class="activate-btn" style="margin-top: 20px; position: relative; z-index: 50;">
            ACTIVATE HEART
        </button>
    `;

    const btn = card.querySelector('.activate-btn');
    btn.onclick = (e) => {
        e.stopPropagation();
        activateHeart(null, docId, data.name, data.tasks);
    };

    projectsGrid.appendChild(card);
    scrollObserver.observe(card);
}

function renderSocialProjectCard(data, docId) {
    const card = document.createElement('div');
    card.className = 'project-card scroll-reveal';
    
    let progress = 0;
    if (data.tasks && data.tasks.length > 0) {
        const completed = data.tasks.filter(t => t.completed).length;
        progress = Math.round((completed / data.tasks.length) * 100);
    }
    
    card.innerHTML = `
        <span class="friend-badge">FROM: ${data.userEmail || 'A Friend'}</span>
        <h3>${data.name}</h3>
        <p>${data.type}</p>
        <div class="card-meta">
            <span>${data.tasks ? data.tasks.length : 0} tasks</span>
            <span style="color: #fbbf24">${progress}% Complete</span>
        </div>
        <div class="card-progress-bar" style="margin-top: 20px;">
            <div class="card-progress-fill" style="width: ${progress}%"></div>
        </div>
        <button class="activate-btn" style="margin-top: 20px; position: relative; z-index: 50;">
            TRACK FRIEND
        </button>
    `;

    const btn = card.querySelector('.activate-btn');
    btn.onclick = (e) => {
        e.stopPropagation();
        activateHeart(null, docId, data.name, data.tasks);
    };

    socialGrid.appendChild(card);
    scrollObserver.observe(card);
}

/* Share Modal Logic */
window.openShareModal = function(e, projectId) {
    if (e) e.stopPropagation();
    shareProjectId = projectId;
    shareEmailInput.value = '';
    shareModalOverlay.classList.remove('hidden');
};

shareModalCancel.addEventListener('click', () => {
    shareModalOverlay.classList.add('hidden');
});

shareModalSend.addEventListener('click', () => {
    const email = shareEmailInput.value.trim().toLowerCase();
    if (!email) {
        alert("Please enter a valid email.");
        return;
    }
    
    if (email === currentUser.email) {
        alert("You cannot share a project with yourself!");
        return;
    }

    db.collection(PROJECTS_COLLECTION).doc(shareProjectId).update({
        sharedWith: firebase.firestore.FieldValue.arrayUnion(email)
    }).then(() => {
        alert("Invitation sent! Your friend can now see your progress on their dashboard.");
        shareModalOverlay.classList.add('hidden');
    }).catch(err => {
        console.error("Share error", err);
        alert("Failed to share project: " + err.message);
    });
});

/* Project Dashboard DND Engine */
function handleProjectDragStart(e) {
    dragSourceProjectIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleProjectDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleProjectDragEnter(e) {
    this.classList.add('drag-over');
}

function handleProjectDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleProjectDragEnd(e) {
    this.classList.remove('dragging');
    const cards = projectsGrid.querySelectorAll('.project-card');
    cards.forEach(card => card.classList.remove('drag-over'));
}

function handleProjectDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    this.classList.remove('drag-over');
    
    const dragTargetIndex = parseInt(this.dataset.index);
    if (dragSourceProjectIndex !== null && dragSourceProjectIndex !== dragTargetIndex) {
        
        const draggedProject = allProjectsArray.splice(dragSourceProjectIndex, 1)[0];
        allProjectsArray.splice(dragTargetIndex, 0, draggedProject);
        
        const batch = db.batch();
        allProjectsArray.forEach((proj, idx) => {
            const docRef = db.collection(PROJECTS_COLLECTION).doc(proj.id);
            batch.update(docRef, { order: idx });
        });
        
        batch.commit().catch(err => {
            console.error("Batch Order Error:", err);
            alert("Error syncing new arrangement to Firebase");
        });
    }
    return false;
}

// Modal handling
addProjectBtn.addEventListener('click', () => {
    newProjectName.value = "";
    newProjectType.selectedIndex = 0;
    modalOverlay.classList.remove('hidden');
});
modalCancel.addEventListener('click', () => modalOverlay.classList.add('hidden'));

modalCreate.addEventListener('click', () => {
    const name = newProjectName.value.trim();
    const type = newProjectType.value;
    if (!name) return alert("Please enter a project name!");
    
    let initialTasks = [];
    if (taskTemplates[type]) {
        initialTasks = taskTemplates[type].map(text => ({ text, completed: false }));
    }
    
    // Close modal instantly for immediate UI feedback
    newProjectName.value = "";
    modalOverlay.classList.add('hidden');
    
    db.collection(PROJECTS_COLLECTION).add({
        name: name,
        type: type,
        tasks: initialTasks,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        sharedWith: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
        alert("Error creating project: " + err.message);
        modalOverlay.classList.remove('hidden'); // reopen on failure
    });
});

/* Duplicate Logic Flow */
let duplicateSourceId = null;
let duplicateSourceType = null;
let duplicateSourceTasks = null;

window.openDuplicateModal = function(e, id, name, type, tasksJson) {
    if (e) e.stopPropagation(); // prevent clicking card to open workspace
    
    duplicateSourceId = id;
    duplicateSourceType = type;
    if (tasksJson) {
        duplicateSourceTasks = typeof tasksJson === 'string' ? JSON.parse(decodeURIComponent(tasksJson)) : tasksJson;
    } else {
        duplicateSourceTasks = [];
    }
    
    duplicateProjectName.value = name + " - copy";
    duplicateCopyFiles.checked = false;
    duplicateModalOverlay.classList.remove('hidden');
};

workspaceDuplicateBtn.addEventListener('click', () => {
    if (!currentProjectData || !currentProjectId) return;
    openDuplicateModal(null, currentProjectId, currentProjectData.name, currentProjectData.type, currentProjectData.tasks);
});

duplicateModalCancel.addEventListener('click', () => {
    duplicateModalOverlay.classList.add('hidden');
});

duplicateModalCreate.addEventListener('click', () => {
    const newName = duplicateProjectName.value.trim();
    if (!newName) return alert("Please enter a duplicate project name!");
    
    const shouldCopyFiles = duplicateCopyFiles.checked;
    duplicateModalOverlay.classList.add('hidden');
    
    db.collection(PROJECTS_COLLECTION).add({
        name: newName,
        type: duplicateSourceType,
        tasks: duplicateSourceTasks, 
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then((docRef) => {
        if (shouldCopyFiles) {
            copyProjectFiles(duplicateSourceId, docRef.id);
        }
    }).catch(err => {
        alert("Error duplicating project: " + err.message);
        duplicateModalOverlay.classList.remove('hidden');
    });
});

function copyProjectFiles(originalId, newId) {
    db.collection(FILES_COLLECTION).where("projectId", "==", originalId).get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) return;
        
        // Use batch to clone references gracefully identically.
        let batch = db.batch();
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            let newDocRef = db.collection(FILES_COLLECTION).doc(); 
            data.projectId = newId;
            data.uploadedAt = firebase.firestore.FieldValue.serverTimestamp(); // Give it a fresh timestamp physically.
            batch.set(newDocRef, data);
        });
        
        return batch.commit();
    }).catch(err => {
        console.error("Error batch copying files: ", err);
        alert("Tasks duplicated perfectly, but encountered an error replicating file linkages.");
    });
}

/* Workspace Logic */
function renderWorkspaceHeader() {
    if (!currentProjectData) return;
    workspaceTitle.innerText = currentProjectData.name;
    workspaceTypeBadge.innerText = currentProjectData.type;
}

function renderTasks() {
    tasksListEl.innerHTML = '';
    const tasks = currentProjectData.tasks || [];
    let completedCount = 0;
    
    tasks.forEach((task, index) => {
        if (task.completed) completedCount++;
        
        let subtasksHTML = '';
        
        if (task.subtasks) {
            task.subtasks.forEach((st, sIndex) => {
                subtasksHTML += `
                    <li class="subtask-item ${st.completed ? 'completed' : ''}">
                        <input type="checkbox" class="task-checkbox" ${st.completed ? 'checked' : ''} onchange="toggleSubtask(${index}, ${sIndex})">
                        <span style="flex:1;">${st.text}</span>
                        <button class="task-delete" onclick="deleteSubtask(${index}, ${sIndex})" style="padding: 2px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                        </button>
                    </li>
                `;
            });
        }
        
        const isExpanded = task.expanded ? '' : 'hidden';
        
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.draggable = true;
        li.dataset.index = index;
        
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('dragend', handleDragEnd);
        
        li.innerHTML = `
            <div class="task-content">
                <button class="task-toggle" onclick="toggleTaskExpand(${index})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${task.expanded ? '90deg' : '0deg'})"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
                <span class="task-text">${task.text}</span>
                <button class="task-delete" onclick="deleteTask(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="subtasks-wrapper ${isExpanded}" id="subtasks-${index}">
                <ul class="subtasks-list">
                    ${subtasksHTML}
                </ul>
                <div class="subtask-input-row">
                    <input type="text" id="subtask-input-${index}" class="custom-input" placeholder="Add smaller goal..." onkeypress="if(event.key === 'Enter') addSubtask(${index})">
                    <button class="btn-primary" onclick="addSubtask(${index})">Add</button>
                </div>
            </div>
        `;
        tasksListEl.appendChild(li);
    });
    
    // Update Achievement Bar UI globally based on all items (tasks and subtasks)
    let totalItems = 0;
    let completedItems = 0;
    
    tasks.forEach(task => {
        totalItems++;
        if (task.completed) completedItems++;
        
        if (task.subtasks) {
            task.subtasks.forEach(st => {
                totalItems++;
                if (st.completed) completedItems++;
            });
        }
    });

    let progress = 0;
    if (totalItems > 0) {
        progress = Math.round((completedItems / totalItems) * 100);
    }
    achievementBar.style.width = progress + '%';
}

/* Drag and Drop Engine */
function handleDragStart(e) {
    dragSourceIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = tasksListEl.querySelectorAll('.task-item');
    items.forEach(item => item.classList.remove('drag-over'));
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    
    const dragTargetIndex = parseInt(this.dataset.index);
    
    if (dragSourceIndex !== null && dragSourceIndex !== dragTargetIndex) {
        if (!currentProjectData) return false;
        const tasks = currentProjectData.tasks;
        
        // Remove task from array
        const draggedTask = tasks.splice(dragSourceIndex, 1)[0];
        // Insert task directly into target index
        tasks.splice(dragTargetIndex, 0, draggedTask);
        
        saveWorkspaceTasks(tasks);
    }
    return false;
}

function saveWorkspaceTasks(updatedTasks) {
    if (!currentProjectId) return;
    db.collection(PROJECTS_COLLECTION).doc(currentProjectId).update({
        tasks: updatedTasks
    });
    syncWithExtension(updatedTasks);
}

function syncWithExtension(tasks) {
    if (!currentProjectData) return;
    
    let total = 0;
    let completed = 0;
    (tasks || []).forEach(t => {
        total++;
        if (t.completed) completed++;
        if (t.subtasks) {
            t.subtasks.forEach(st => {
                total++;
                if (st.completed) completed++;
            });
        }
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Sync via DOM Attributes (most reliable for Unpacked extensions)
    document.documentElement.setAttribute('data-heartbeat-progress', progress);
    document.documentElement.setAttribute('data-heartbeat-project-name', currentProjectData.name);
    document.documentElement.setAttribute('data-heartbeat-project-id', currentProjectId);
}

window.activateHeart = function(e, id, name, tasks) {
    if (e) e.stopPropagation();
    
    // Temporarily set context for sync
    const originalId = currentProjectId;
    const originalData = currentProjectData;
    
    currentProjectId = id;
    currentProjectData = { name: name };
    
    syncWithExtension(tasks);
    
    // Restore context (optional, but safer)
    currentProjectId = originalId;
    currentProjectData = originalData;
    
    alert(`Heart activated for: ${name} ❤️`);
};

addTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text && currentProjectData) {
        const tasks = currentProjectData.tasks || [];
        tasks.push({ text, completed: false });
        saveWorkspaceTasks(tasks);
        taskInput.value = '';
    }
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTaskBtn.click();
});

window.toggleTaskExpand = function(index) {
    if (!currentProjectData) return;
    const tasks = currentProjectData.tasks;
    tasks[index].expanded = !tasks[index].expanded;
    saveWorkspaceTasks(tasks); 
};

window.addSubtask = function(parentIndex) {
    if (!currentProjectData) return;
    const input = document.getElementById('subtask-input-' + parentIndex);
    const text = input.value.trim();
    if (text) {
        const tasks = currentProjectData.tasks;
        if (!tasks[parentIndex].subtasks) tasks[parentIndex].subtasks = [];
        tasks[parentIndex].subtasks.push({ text, completed: false });
        saveWorkspaceTasks(tasks);
    }
};

window.toggleSubtask = function(parentIndex, subIndex) {
    if (!currentProjectData) return;
    const tasks = currentProjectData.tasks;
    tasks[parentIndex].subtasks[subIndex].completed = !tasks[parentIndex].subtasks[subIndex].completed;
    saveWorkspaceTasks(tasks);
};

window.deleteSubtask = function(parentIndex, subIndex) {
    if (!currentProjectData) return;
    const tasks = currentProjectData.tasks;
    tasks[parentIndex].subtasks.splice(subIndex, 1);
    saveWorkspaceTasks(tasks);
};

window.toggleTask = function(index) {
    if (!currentProjectData) return;
    const tasks = currentProjectData.tasks;
    tasks[index].completed = !tasks[index].completed;
    
    if (tasks[index].completed) {
        window.fireConfetti();
    }
    
    saveWorkspaceTasks(tasks);
};

window.fireConfetti = function() {
    const colors = ['#00ffcc', '#3b82f6', '#fbbf24', '#ec4899', '#ffffff'];
    const bar = document.getElementById('achievement-bar');
    if (!bar) return;
    
    const rect = bar.getBoundingClientRect();
    // Origin mapping dynamically scales against completion width
    const originX = rect.left + rect.width;
    const originY = rect.top + (rect.height / 2);
    
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'pixel-confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = originX + 'px';
        confetti.style.top = originY + 'px';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 200;
        const dx = Math.cos(angle) * velocity;
        const dy = (Math.sin(angle) * velocity) + 150; // gravity
        const rot = Math.random() * 360 + 180;
        
        confetti.style.setProperty('--dx', dx + 'px');
        confetti.style.setProperty('--dy', dy + 'px');
        confetti.style.setProperty('--rot', rot + 'deg');
        
        document.body.appendChild(confetti);
        
        // Ensure DOM purges the elements natively after sequence ends
        setTimeout(() => confetti.remove(), 1000);
    }
};

window.deleteTask = function(index) {
    if(!currentProjectData) return;
    const tasks = currentProjectData.tasks;
    tasks.splice(index, 1);
    saveWorkspaceTasks(tasks);
};

/* Ghost Notes Mechanics */
const thoughtInput = document.getElementById('thought-input');
const thoughtsContainer = document.getElementById('thoughts-container');

if (thoughtInput) {
    thoughtInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = thoughtInput.value.trim();
            if (text) {
                sessionThoughts.unshift(text); // Session only - erased on refresh
                thoughtInput.value = ''; 
                renderGhostThoughts();
            }
        }
    });
}

function renderGhostThoughts() {
    if (!thoughtsContainer) return;
    thoughtsContainer.innerHTML = '';
    
    sessionThoughts.forEach((thoughtText) => {
        const span = document.createElement('span');
        span.className = 'ghost-thought scroll-reveal';
        span.innerText = thoughtText;
        thoughtsContainer.appendChild(span);
        scrollObserver.observe(span);
    });
}

/* Background Doodle Engine */
const canvas = document.getElementById('bg-canvas');
let ctx = null;
let isDrawing = false;
let lastX = 0; let lastY = 0;

if (canvas) {
    ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    window.addEventListener('mousedown', (e) => {
        // Enforce limitation specifically tracking Dashboard View visibility
        if (!dashboardView || dashboardView.classList.contains('hidden')) return;
        // Block drawing if clicking physically on top of a UI element native to the user
        if (e.target.closest('.project-card, button, input, a, .modal-content, .empty-state')) return;
        
        isDrawing = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDrawing || !ctx) return;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.strokeStyle = '#fbbf24'; // Neon Yellow strictly applied
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    window.addEventListener('mouseup', () => {
        if (!isDrawing || !ctx) return;
        isDrawing = false;
        
        // Drops absolute layer opacity natively for burning the drawings iteratively
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    window.addEventListener('mouseleave', () => {
        isDrawing = false;
    });
}

/* ASMR SYSTEM LOGIC */
let asmrStore = {
    videos: JSON.parse(localStorage.getItem('heartbeat_asmr_videos') || '[]'),
    activeVideoId: null,
    playerState: JSON.parse(localStorage.getItem('heartbeat_asmr_player') || JSON.stringify({
        x: 20,
        y: 80,
        width: 320,
        height: 180,
        isMinimized: false,
        isVisible: false
    }))
};

function saveASMRState() {
    localStorage.setItem('heartbeat_asmr_videos', JSON.stringify(asmrStore.videos));
    localStorage.setItem('heartbeat_asmr_player', JSON.stringify(asmrStore.playerState));
    
    // Sync with Extension via Data Attribute (Bridge)
    document.documentElement.setAttribute('data-asmr-library', JSON.stringify(asmrStore.videos));
    document.documentElement.setAttribute('data-asmr-player-props', JSON.stringify(asmrStore.playerState));
}

function initASMR() {
    const toggleBtn = document.getElementById('asmr-toggle-btn');
    const sidebar = document.getElementById('asmr-sidebar');
    const closeBtn = document.getElementById('asmr-sidebar-close');
    const addBtn = document.getElementById('asmr-add-btn');
    const urlInput = document.getElementById('asmr-url-input');
    const playerContainer = document.getElementById('asmr-player-container');
    const playerClose = document.getElementById('asmr-player-close');
    const playerMinimize = document.getElementById('asmr-player-minimize');

    if (toggleBtn) toggleBtn.onclick = () => sidebar.classList.toggle('hidden');
    if (closeBtn) closeBtn.onclick = () => sidebar.classList.add('hidden');

    if (addBtn) {
        addBtn.onclick = async () => {
            const url = urlInput.value.trim();
            if (!url) return;
            
            const videoId = extractYouTubeId(url);
            if (!videoId) return alert("Invalid YouTube URL");

            addBtn.innerText = "FETCHING...";
            addBtn.disabled = true;

            try {
                const meta = await fetchYouTubeMetadata(videoId);
                if (meta) {
                    const newVideo = {
                        id: Date.now().toString(),
                        videoId,
                        title: meta.title,
                        creator: meta.channelTitle,
                        thumbnail: meta.thumbnails.medium.url,
                        duration: meta.duration,
                        createdAt: new Date().toISOString()
                    };
                    asmrStore.videos.unshift(newVideo);
                    saveASMRState();
                    renderASMRLibrary();
                    urlInput.value = "";
                }
            } catch (err) {
                alert("Error fetching video metadata. Check your API key.");
            } finally {
                addBtn.innerText = "ADD TO LIBRARY";
                addBtn.disabled = false;
            }
        };
    }

    if (playerClose) playerClose.onclick = () => {
        asmrStore.playerState.isVisible = false;
        saveASMRState();
        playerContainer.classList.add('hidden');
        document.getElementById('asmr-video-wrapper').innerHTML = '';
    };

    if (playerMinimize) playerMinimize.onclick = () => {
        asmrStore.playerState.isMinimized = !asmrStore.playerState.isMinimized;
        saveASMRState();
        playerContainer.classList.toggle('minimized', asmrStore.playerState.isMinimized);
    };

    initDraggablePlayer();
    initResizablePlayer();
    renderASMRLibrary();
    
    // Restore player state
    if (asmrStore.playerState.isVisible) {
        const lastVideo = asmrStore.videos.find(v => v.id === asmrStore.activeVideoId) || asmrStore.videos[0];
        if (lastVideo) playASMRVideo(lastVideo);
    }
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function fetchYouTubeMetadata(videoId) {
    const apiKey = firebaseConfig.youtubeApiKey;
    if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY") {
        throw new Error("Missing YouTube API Key");
    }

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
        return {
            ...data.items[0].snippet,
            duration: data.items[0].contentDetails.duration
        };
    }
    return null;
}

function renderASMRLibrary() {
    const list = document.getElementById('asmr-list');
    if (!list) return;
    list.innerHTML = '';

    asmrStore.videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'asmr-card';
        card.innerHTML = `
            <div class="asmr-card-thumb" style="background-image: url('${video.thumbnail}')"></div>
            <div class="asmr-card-info">
                <div class="asmr-card-title">${video.title}</div>
                <div class="asmr-card-creator">${video.creator}</div>
            </div>
            <button class="asmr-card-remove" title="Remove">&times;</button>
        `;

        card.onclick = (e) => {
            if (e.target.classList.contains('asmr-card-remove')) {
                asmrStore.videos = asmrStore.videos.filter(v => v.id !== video.id);
                saveASMRState();
                renderASMRLibrary();
                return;
            }
            playASMRVideo(video);
        };

        list.appendChild(card);
    });
}

function playASMRVideo(video) {
    const playerContainer = document.getElementById('asmr-player-container');
    const title = document.getElementById('asmr-player-title');

    asmrStore.activeVideoId = video.id;
    asmrStore.playerState.isVisible = true;
    saveASMRState();

    // Trigger Extension Player via Data Attribute (Bridge)
    document.documentElement.setAttribute('data-asmr-trigger', JSON.stringify({
        type: 'ASMR_PLAY',
        video: video,
        startTime: 0,
        ts: Date.now()
    }));
    
    // Hide local player since extension is taking over
    if (playerContainer) {
        playerContainer.classList.add('hidden');
        title.innerText = video.title; // For consistency
    }
}

function initDraggablePlayer() {
    const container = document.getElementById('asmr-player-container');
    const header = document.getElementById('asmr-player-header');
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    header.onmousedown = (e) => {
        isDragging = true;
        offset.x = e.clientX - container.offsetLeft;
        offset.y = e.clientY - container.offsetTop;
        header.style.cursor = 'grabbing';
    };

    window.onmousemove = (e) => {
        if (!isDragging) return;
        const x = e.clientX - offset.x;
        const y = e.clientY - offset.y;
        
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        
        asmrStore.playerState.x = x;
        asmrStore.playerState.y = y;
    };

    window.onmouseup = () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
            saveASMRState();
        }
    };
}

function initResizablePlayer() {
    const container = document.getElementById('asmr-player-container');
    const handle = document.getElementById('asmr-resize-handle');
    let isResizing = false;

    handle.onmousedown = (e) => {
        e.preventDefault();
        isResizing = true;
    };

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const width = e.clientX - container.offsetLeft;
        const height = e.clientY - container.offsetTop;
        
        if (width > 200) container.style.width = width + 'px';
        if (height > 150) container.style.height = height + 'px';
        
        asmrStore.playerState.width = parseInt(container.style.width);
        asmrStore.playerState.height = parseInt(container.style.height);
    });

    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            saveASMRState();
        }
    });
}
