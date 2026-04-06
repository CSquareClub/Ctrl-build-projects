// API Base URL
const API_BASE = 'http://127.0.0.1:8000/api/room';

// State
let currentUser = localStorage.getItem("username");
let activeRoom = null;
let currentInviteCode = '';
let refreshInterval = null;

// Auth check
if (!currentUser) {
    window.location.href = '../login.html';
}

// Views
const views = {
    hub: document.getElementById('view-hub'),
    create: document.getElementById('view-create'),
    join: document.getElementById('view-join'),
    invite: document.getElementById('view-invite'),
    chat: document.getElementById('view-chat')
};

function showView(viewName) {
    Object.values(views).forEach(v => v.style.display = 'none');
    views[viewName].style.display = viewName === 'chat' ? 'flex' : 'flex';
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Username': currentUser
    };
}

// Initialize User Profile in UI
document.getElementById('sidebar-username').textContent = currentUser;
document.getElementById('avatar-initials').textContent = currentUser.substring(0, 2).toUpperCase();

// Load Initial Data
window.onload = () => {
    fetchMyRooms();
};

function clearErrors() {
    document.querySelectorAll('[id$="-error"]').forEach(el => el.style.display = 'none');
}

// Hub / Back Navigation
document.getElementById('hub-btn').onclick = () => {
    activeRoom = null;
    showView('hub');
    clearErrors();
    document.getElementById('room-header-title').textContent = '';
    document.getElementById('room-info-btn').style.display = 'none';
    if(refreshInterval) clearInterval(refreshInterval);
    fetchMyRooms(); 
};
document.getElementById('nav-create-btn').onclick = () => { clearErrors(); showView('create'); };
document.getElementById('nav-join-btn').onclick = () => { clearErrors(); showView('join'); };
document.getElementById('cancel-create-btn').onclick = () => { showView('hub'); };
document.getElementById('cancel-join-btn').onclick = () => { showView('hub'); };

// Info/Invite Navigation
document.getElementById('room-info-btn').onclick = () => {
    clearErrors();
    document.getElementById('display-invite-code').textContent = currentInviteCode;
    showView('invite');
};
document.getElementById('cancel-invite-btn').onclick = () => showView('chat');

// API Interactions
async function fetchMyRooms() {
    try {
        const res = await fetch(`${API_BASE}/my-rooms`, { headers: getHeaders() });
        const data = await res.json();
        renderRoomList(data.rooms);
    } catch(e) { console.error('Fetch rooms error:', e); }
}

function renderRoomList(rooms) {
    const list = document.getElementById('room-list');
    list.innerHTML = '';
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = `history-item ${activeRoom === room.id ? 'active' : ''}`;
        div.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="history-title">${room.name}</span>
        `;
        div.style.cursor = 'pointer';
        div.onclick = () => selectRoom(room);
        list.appendChild(div);
    });
}

document.getElementById('submit-create-btn').onclick = async () => {
    const errorDiv = document.getElementById('create-error');
    errorDiv.style.display = 'none';
    
    const name = document.getElementById('create-room-name').value.trim();
    const description = document.getElementById('create-room-desc').value.trim();
    if(!name) {
        errorDiv.textContent = 'Room name is required.';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/create`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, description })
        });
        
        if(res.ok){
            const room = await res.json();
            document.getElementById('create-room-name').value = '';
            document.getElementById('create-room-desc').value = '';
            fetchMyRooms();
            selectRoom(room);
        } else {
            const data = await res.json();
            errorDiv.textContent = data.detail || 'Failed to create room.';
            errorDiv.style.display = 'block';
        }
    } catch(e) {
        errorDiv.textContent = 'Network error occurred.';
        errorDiv.style.display = 'block';
    }
};

document.getElementById('submit-join-btn').onclick = async () => {
    const errorDiv = document.getElementById('join-error');
    errorDiv.style.display = 'none';
    
    const code = document.getElementById('join-room-code').value.trim();
    if(!code) {
        errorDiv.textContent = 'Invite code is required.';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/join`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify({ invite_code: code })
        });
        
        if(res.ok){
            const room = await res.json();
            document.getElementById('join-room-code').value = '';
            fetchMyRooms();
            selectRoom(room);
        } else {
            const data = await res.json();
            errorDiv.textContent = data.detail || 'Invalid or expired invite code.';
            errorDiv.style.display = 'block';
        }
    } catch(e) {
        errorDiv.textContent = 'Network error occurred.';
        errorDiv.style.display = 'block';
    }
};

document.getElementById('submit-invite-btn').onclick = async () => {
    const errorDiv = document.getElementById('invite-error');
    errorDiv.style.display = 'none';

    const target = document.getElementById('invite-username').value.trim();
    if(!target || !activeRoom) return;

    try {
        const res = await fetch(`${API_BASE}/${activeRoom}/invite`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify({ target_username: target })
        });
        
        if(res.ok) {
            document.getElementById('invite-username').value = '';
            showView('chat');
            alert(`User ${target} has been added to the room.`);
        } else {
            const data = await res.json();
            errorDiv.textContent = data.detail || 'Could not send invite.';
            errorDiv.style.display = 'block';
        }
    } catch(e) {
        errorDiv.textContent = 'Network error occurred.';
        errorDiv.style.display = 'block';
    }
};

async function selectRoom(room) {
    activeRoom = room.id;
    currentInviteCode = room.invite_code;

    document.getElementById('room-header-title').textContent = room.name;
    document.getElementById('room-info-btn').style.display = 'block';
    document.getElementById('send-msg-btn').disabled = false;

    showView('chat');
    fetchMyRooms(); // refresh active highlight
    loadMessages();

    if(refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadMessages, 3000);
}

async function loadMessages() {
    if(!activeRoom) return;
    try {
        const res = await fetch(`${API_BASE}/${activeRoom}/messages`, { headers: getHeaders() });
        if(res.ok) {
            const data = await res.json();
            renderMessages(data.messages);
        }
    } catch(e){}
}

function renderMessages(messages) {
    const box = document.getElementById('chat-view-messages');
    if(messages.length === 0){
        box.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Room is empty. Be the first to say hi!</p>`;
        return;
    }

    box.innerHTML = '';
    let html = '';
    messages.forEach(m => {
        const time = new Date(m.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        html += `
            <div class="msg-wrapper">
                <div class="msg-header">
                    <span class="sender">${m.sender_username}</span>
                    <span class="time">${time}</span>
                </div>
                <div class="msg-bubble">${m.content}</div>
            </div>
        `;
    });
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
}

document.getElementById('send-msg-btn').onclick = async () => {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if(!txt || !activeRoom) return;

    input.value = '';
    await fetch(`${API_BASE}/${activeRoom}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content: txt })
    });
    loadMessages();
};

document.getElementById('chat-input').onkeypress = (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-msg-btn').click();
    }
};

// Sidebar Toggle Mobile
document.getElementById('sidebar-toggle').addEventListener('click', () => {
	document.getElementById('sidebar').classList.toggle('collapsed');
});