const API_BASE = 'http://127.0.0.1:8000/api/room';
const REQUEST_TIMEOUT_MS = 15000;

let currentUser = localStorage.getItem('username');
let activeRoom = null;
let currentInviteCode = '';
let activeRoomAdmin = '';
let refreshInterval = null;

if (!currentUser) {
    window.location.href = '../login.html';
}

const views = {
    hub: document.getElementById('view-hub'),
    create: document.getElementById('view-create'),
    join: document.getElementById('view-join'),
    invite: document.getElementById('view-invite'),
    chat: document.getElementById('view-chat')
};

const ui = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    mobileCloseBtn: document.getElementById('mobile-close-btn'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    hubBtn: document.getElementById('hub-btn'),
    mainAiBtn: document.getElementById('main-ai-btn'),
    navCreateBtn: document.getElementById('nav-create-btn'),
    navJoinBtn: document.getElementById('nav-join-btn'),
    cancelCreateBtn: document.getElementById('cancel-create-btn'),
    cancelJoinBtn: document.getElementById('cancel-join-btn'),
    roomInfoBtn: document.getElementById('room-info-btn'),
    openManageBtn: document.getElementById('open-manage-btn'),
    cancelInviteBtn: document.getElementById('cancel-invite-btn'),
    roomList: document.getElementById('room-list'),
    roomHeaderTitle: document.getElementById('room-header-title'),
    sendMsgBtn: document.getElementById('send-msg-btn'),
    chatInput: document.getElementById('chat-input'),
    chatMessages: document.getElementById('chat-view-messages'),
    sidebarUsername: document.getElementById('sidebar-username'),
    avatarInitials: document.getElementById('avatar-initials'),
    createName: document.getElementById('create-room-name'),
    createDesc: document.getElementById('create-room-desc'),
    joinCode: document.getElementById('join-room-code'),
    inviteUsername: document.getElementById('invite-username'),
    displayInviteCode: document.getElementById('display-invite-code'),
    copyInviteBtn: document.getElementById('copy-invite-btn'),
    refreshMembersBtn: document.getElementById('refresh-members-btn'),
    memberListPanel: document.getElementById('member-list-panel'),
    leaveRoomBtn: document.getElementById('leave-room-btn'),
    deleteRoomBtn: document.getElementById('delete-room-btn'),
    refreshInvitationsBtn: document.getElementById('refresh-invitations-btn'),
    pendingInvitationsList: document.getElementById('pending-invitations-list'),
    refreshRequestsBtn: document.getElementById('refresh-requests-btn'),
    joinRequestList: document.getElementById('join-request-list')
};

function showView(viewName) {
    Object.values(views).forEach((view) => {
        view.classList.add('room-hidden');
    });
    views[viewName].classList.remove('room-hidden');
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Username': currentUser
    };
}

function clearErrors() {
    document.querySelectorAll('.form-error').forEach((el) => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function clearStatus() {
    [
        'hub-status',
        'invite-copy-status',
        'action-status',
        'chat-error',
        'room-action-note'
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            if (el.classList.contains('form-error')) {
                el.style.display = 'none';
            }
        }
    });
}

function showError(id, message) {
    const errorDiv = document.getElementById(id);
    if (!errorDiv) {
        return;
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function setStatus(id, message) {
    const statusDiv = document.getElementById(id);
    if (!statusDiv) {
        return;
    }

    if (!message) {
        statusDiv.textContent = '';
        if (statusDiv.classList.contains('form-error')) {
            statusDiv.style.display = 'none';
        }
        return;
    }

    statusDiv.textContent = message;
    if (statusDiv.classList.contains('form-error')) {
        statusDiv.style.display = 'block';
    }
}

function resetRoomContext() {
    activeRoom = null;
    currentInviteCode = '';
    activeRoomAdmin = '';
    ui.roomHeaderTitle.textContent = '';
    ui.roomInfoBtn.style.display = 'none';
    ui.sendMsgBtn.disabled = true;

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function isCurrentUserAdmin() {
    return activeRoomAdmin === currentUser;
}

function getInitials(name) {
    return (name || '--').substring(0, 2).toUpperCase();
}

function formatMessageTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getNetworkErrorMessage(error) {
    if (error && error.name === 'AbortError') {
        return 'Request timed out. Please retry.';
    }
    return 'Cannot reach room server. Ensure backend is running on 127.0.0.1:8000.';
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function readResponseBody(res) {
    const raw = await res.text();
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

async function getErrorMessage(res, fallback) {
    const payload = await readResponseBody(res);

    if (payload && typeof payload === 'object') {
        if (typeof payload.detail === 'string' && payload.detail.trim()) {
            return payload.detail;
        }
        if (typeof payload.message === 'string' && payload.message.trim()) {
            return payload.message;
        }
    }

    if (typeof payload === 'string' && payload.trim()) {
        return payload.trim();
    }

    return `${fallback} (HTTP ${res.status})`;
}

function createRoomIcon() {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    return wrapper.firstChild;
}

function openMobileSidebar() {
    ui.sidebar.classList.add('active');
    ui.sidebarOverlay.classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    ui.sidebar.classList.remove('active');
    ui.sidebarOverlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

function renderRoomList(rooms) {
    ui.roomList.innerHTML = '';

    if (!rooms.length) {
        ui.roomList.innerHTML = '<div class="room-list-notice">No rooms yet</div>';
        return;
    }

    rooms.forEach((room) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `history-item room-list-item ${activeRoom === room.id ? 'active' : ''}`;
        item.appendChild(createRoomIcon());

        const title = document.createElement('span');
        title.className = 'history-title';
        title.textContent = room.name;
        item.appendChild(title);

        if (room.admin_username === currentUser) {
            const ownerTag = document.createElement('span');
            ownerTag.className = 'member-tag';
            ownerTag.textContent = 'Owner';
            item.appendChild(ownerTag);
        }

        item.addEventListener('click', () => {
            selectRoom(room);
        });
        ui.roomList.appendChild(item);
    });
}

function renderPendingInvitations(invitations) {
    ui.pendingInvitationsList.innerHTML = '';

    if (!invitations.length) {
        ui.pendingInvitationsList.innerHTML = '<div class="room-list-notice">No invitations pending</div>';
        return;
    }

    invitations.forEach((invitation) => {
        const row = document.createElement('div');
        row.className = 'invitation-row';

        const main = document.createElement('div');
        main.className = 'invite-main';

        const room = document.createElement('div');
        room.className = 'invite-room';
        room.textContent = invitation.room_name;

        const meta = document.createElement('div');
        meta.className = 'invite-meta';
        meta.textContent = `Invited by ${invitation.inviter_username}`;

        main.appendChild(room);
        main.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'row-actions';

        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'mini-action-btn accept';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', () => {
            acceptInvitation(invitation.id);
        });

        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'mini-action-btn reject';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => {
            rejectInvitation(invitation.id);
        });

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);

        row.appendChild(main);
        row.appendChild(actions);
        ui.pendingInvitationsList.appendChild(row);
    });
}

function renderJoinRequests(requests) {
    ui.joinRequestList.innerHTML = '';

    if (!isCurrentUserAdmin()) {
        ui.joinRequestList.innerHTML = '<div class="room-list-notice">Only admin can review join requests</div>';
        return;
    }

    if (!requests.length) {
        ui.joinRequestList.innerHTML = '<div class="room-list-notice">No pending requests</div>';
        return;
    }

    requests.forEach((request) => {
        const row = document.createElement('div');
        row.className = 'request-row';

        const main = document.createElement('div');
        main.className = 'request-main';

        const username = document.createElement('div');
        username.className = 'request-user';
        username.textContent = request.requester_username;

        const meta = document.createElement('div');
        meta.className = 'request-meta';
        meta.textContent = `Wants to join ${request.room_name}`;

        main.appendChild(username);
        main.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'row-actions';

        const approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'mini-action-btn accept';
        approveBtn.textContent = 'Approve';
        approveBtn.addEventListener('click', () => {
            approveJoinRequest(request.id, request.requester_username);
        });

        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'mini-action-btn reject';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => {
            rejectJoinRequest(request.id, request.requester_username);
        });

        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);

        row.appendChild(main);
        row.appendChild(actions);
        ui.joinRequestList.appendChild(row);
    });
}

function renderMembers(members) {
    ui.memberListPanel.innerHTML = '';

    if (!members.length) {
        ui.memberListPanel.innerHTML = '<div class="room-list-notice">No members found</div>';
        return;
    }

    const isAdmin = isCurrentUserAdmin();

    members.forEach((member) => {
        const row = document.createElement('div');
        row.className = 'member-row';

        const meta = document.createElement('div');
        meta.className = 'member-meta';

        const avatar = document.createElement('div');
        avatar.className = 'member-avatar';
        avatar.textContent = getInitials(member.username);

        const details = document.createElement('div');
        const nameRow = document.createElement('div');
        nameRow.className = 'member-name-row';

        const name = document.createElement('span');
        name.className = 'member-name';
        name.textContent = member.username;
        nameRow.appendChild(name);

        if (member.username === currentUser) {
            const youTag = document.createElement('span');
            youTag.className = 'member-tag';
            youTag.textContent = 'You';
            nameRow.appendChild(youTag);
        }

        const role = document.createElement('span');
        role.className = `role-pill ${member.role}`;
        role.textContent = member.role;
        nameRow.appendChild(role);

        details.appendChild(nameRow);
        meta.appendChild(avatar);
        meta.appendChild(details);
        row.appendChild(meta);

        if (isAdmin && member.username !== currentUser) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-member-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                removeMember(member.username);
            });
            row.appendChild(removeBtn);
        }

        ui.memberListPanel.appendChild(row);
    });

    ui.deleteRoomBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    ui.leaveRoomBtn.style.display = isAdmin ? 'none' : 'inline-flex';
    setStatus('room-action-note', isAdmin ? 'Admin cannot leave room. Use Delete Room.' : 'You can leave this room anytime.');
}

function renderMessages(messages) {
    ui.chatMessages.innerHTML = '';

    if (!messages.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-room-message';
        empty.textContent = 'Room is empty. Start the first message.';
        ui.chatMessages.appendChild(empty);
        return;
    }

    messages.forEach((message) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'msg-wrapper';

        const header = document.createElement('div');
        header.className = 'msg-header';

        const sender = document.createElement('span');
        sender.className = 'sender';
        sender.textContent = message.sender_username;

        const time = document.createElement('span');
        time.className = 'time';
        time.textContent = formatMessageTime(message.sent_at);

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = message.content;

        header.appendChild(sender);
        header.appendChild(time);
        wrapper.appendChild(header);
        wrapper.appendChild(bubble);
        ui.chatMessages.appendChild(wrapper);
    });

    ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
}

async function fetchMyRooms() {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/my-rooms`, { headers: getHeaders() });
        if (!res.ok) {
            throw new Error(await getErrorMessage(res, 'Failed to load rooms'));
        }

        const data = await res.json();
        const rooms = data.rooms || [];
        renderRoomList(rooms);

        if (activeRoom && !rooms.some((room) => room.id === activeRoom)) {
            resetRoomContext();
            showView('hub');
            setStatus('hub-status', 'Current room is no longer available.');
        }
    } catch (error) {
        ui.roomList.innerHTML = '<div class="room-list-notice">Room service unavailable</div>';
        console.error(error);
    }
}

async function fetchPendingInvitations(showErrors = true) {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/invitations/me`, { headers: getHeaders() });
        if (!res.ok) {
            throw new Error(await getErrorMessage(res, 'Failed to load invitations'));
        }

        const data = await res.json();
        renderPendingInvitations(data.invitations || []);
    } catch (error) {
        renderPendingInvitations([]);
        if (showErrors) {
            showError('invitation-error', error.message || 'Failed to load invitations');
        }
    }
}

async function loadMembers(showErrors = true) {
    if (!activeRoom) {
        renderMembers([]);
        return;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/members`, { headers: getHeaders() });
        if (!res.ok) {
            throw new Error(await getErrorMessage(res, 'Failed to load members'));
        }

        const data = await res.json();
        const members = data.members || [];

        const admin = members.find((member) => member.role === 'admin');
        activeRoomAdmin = admin ? admin.username : activeRoomAdmin;
        renderMembers(members);
    } catch (error) {
        renderMembers([]);
        if (showErrors) {
            showError('manage-error', error.message || 'Failed to load members');
        }
    }
}

async function loadJoinRequests(showErrors = true) {
    if (!activeRoom) {
        renderJoinRequests([]);
        return;
    }

    if (!isCurrentUserAdmin()) {
        renderJoinRequests([]);
        return;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/join-requests`, { headers: getHeaders() });
        if (!res.ok) {
            throw new Error(await getErrorMessage(res, 'Failed to load join requests'));
        }

        const data = await res.json();
        renderJoinRequests(data.requests || []);
    } catch (error) {
        renderJoinRequests([]);
        if (showErrors) {
            showError('request-error', error.message || 'Failed to load join requests');
        }
    }
}

async function loadMessages() {
    if (!activeRoom) {
        return;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/messages`, { headers: getHeaders() });
        if (!res.ok) {
            const message = await getErrorMessage(res, 'Failed to load messages');
            if (res.status === 403 || res.status === 404) {
                resetRoomContext();
                await Promise.all([fetchMyRooms(), fetchPendingInvitations(false)]);
                showView('hub');
                setStatus('hub-status', message);
                return;
            }
            setStatus('chat-error', message);
            return;
        }

        const data = await res.json();
        renderMessages(data.messages || []);
    } catch (error) {
        setStatus('chat-error', getNetworkErrorMessage(error));
    }
}

async function selectRoom(room) {
    activeRoom = room.id;
    currentInviteCode = room.invite_code;
    activeRoomAdmin = room.admin_username || '';

    ui.roomHeaderTitle.textContent = room.name;
    ui.roomInfoBtn.style.display = 'inline-flex';
    ui.sendMsgBtn.disabled = false;
    ui.displayInviteCode.textContent = currentInviteCode || '---';

    clearErrors();
    clearStatus();
    showView('chat');
    closeMobileSidebar();

    await Promise.all([
        fetchMyRooms(),
        fetchPendingInvitations(false),
        loadMessages(),
        loadMembers(false),
        loadJoinRequests(false)
    ]);

    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(loadMessages, 3000);
}

async function openManageView() {
    if (!activeRoom) {
        return;
    }
    clearErrors();
    clearStatus();
    ui.displayInviteCode.textContent = currentInviteCode || '---';
    showView('invite');
    await Promise.all([loadMembers(), loadJoinRequests()]);
}

async function copyInviteCode() {
    if (!currentInviteCode) {
        setStatus('invite-copy-status', 'No invite code available.');
        return;
    }

    try {
        await navigator.clipboard.writeText(currentInviteCode);
        setStatus('invite-copy-status', 'Invite code copied.');
    } catch {
        setStatus('invite-copy-status', 'Copy failed. Please copy manually.');
    }
}

async function acceptInvitation(invitationId) {
    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/invitations/${invitationId}/accept`, {
            method: 'POST',
            headers: getHeaders()
        });

        if (!res.ok) {
            showError('invitation-error', await getErrorMessage(res, 'Failed to accept invitation'));
            return;
        }

        const data = await res.json();
        setStatus('hub-status', data.message || 'Invitation accepted.');
        await Promise.all([fetchMyRooms(), fetchPendingInvitations(false)]);
    } catch (error) {
        showError('invitation-error', getNetworkErrorMessage(error));
    }
}

async function rejectInvitation(invitationId) {
    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/invitations/${invitationId}/reject`, {
            method: 'POST',
            headers: getHeaders()
        });

        if (!res.ok) {
            showError('invitation-error', await getErrorMessage(res, 'Failed to reject invitation'));
            return;
        }

        await fetchPendingInvitations(false);
    } catch (error) {
        showError('invitation-error', getNetworkErrorMessage(error));
    }
}

async function approveJoinRequest(requestId, username) {
    if (!activeRoom) {
        return;
    }

    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/join-requests/${requestId}/approve`, {
            method: 'POST',
            headers: getHeaders()
        });

        if (!res.ok) {
            showError('request-error', await getErrorMessage(res, 'Failed to approve request'));
            return;
        }

        setStatus('action-status', `${username} approved.`);
        await Promise.all([loadJoinRequests(false), loadMembers(false), fetchMyRooms()]);
    } catch (error) {
        showError('request-error', getNetworkErrorMessage(error));
    }
}

async function rejectJoinRequest(requestId, username) {
    if (!activeRoom) {
        return;
    }

    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/join-requests/${requestId}/reject`, {
            method: 'POST',
            headers: getHeaders()
        });

        if (!res.ok) {
            showError('request-error', await getErrorMessage(res, 'Failed to reject request'));
            return;
        }

        setStatus('action-status', `${username} request rejected.`);
        await loadJoinRequests(false);
    } catch (error) {
        showError('request-error', getNetworkErrorMessage(error));
    }
}

async function removeMember(targetUsername) {
    if (!activeRoom || !targetUsername) {
        return;
    }

    if (!window.confirm(`Remove ${targetUsername} from this room?`)) {
        return;
    }

    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/remove-member`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ target_username: targetUsername })
        });

        if (!res.ok) {
            showError('manage-error', await getErrorMessage(res, 'Failed to remove member'));
            return;
        }

        setStatus('action-status', `${targetUsername} removed.`);
        await Promise.all([loadMembers(false), fetchMyRooms()]);
    } catch (error) {
        showError('manage-error', getNetworkErrorMessage(error));
    }
}

async function leaveRoom() {
    if (!activeRoom) {
        return;
    }

    if (isCurrentUserAdmin()) {
        showError('manage-error', 'Admin cannot leave room. Delete room instead.');
        return;
    }

    if (!window.confirm('Leave this room now?')) {
        return;
    }

    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/leave`, {
            method: 'POST',
            headers: getHeaders()
        });

        if (!res.ok) {
            showError('manage-error', await getErrorMessage(res, 'Failed to leave room'));
            return;
        }

        const data = await res.json();
        resetRoomContext();
        await Promise.all([fetchMyRooms(), fetchPendingInvitations(false)]);
        showView('hub');
        setStatus('hub-status', data.message || 'You left the room.');
    } catch (error) {
        showError('manage-error', getNetworkErrorMessage(error));
    }
}

async function deleteRoom() {
    if (!activeRoom) {
        return;
    }

    if (!isCurrentUserAdmin()) {
        showError('manage-error', 'Only admin can delete the room.');
        return;
    }

    if (!window.confirm('Delete this room for everyone? This action cannot be undone.')) {
        return;
    }

    clearErrors();
    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!res.ok) {
            showError('manage-error', await getErrorMessage(res, 'Failed to delete room'));
            return;
        }

        resetRoomContext();
        await Promise.all([fetchMyRooms(), fetchPendingInvitations(false)]);
        showView('hub');
        setStatus('hub-status', 'Room deleted successfully.');
    } catch (error) {
        showError('manage-error', getNetworkErrorMessage(error));
    }
}

ui.sidebarUsername.textContent = currentUser;
ui.avatarInitials.textContent = getInitials(currentUser);

ui.mainAiBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
});

ui.hubBtn.addEventListener('click', async () => {
    resetRoomContext();
    clearErrors();
    clearStatus();
    showView('hub');
    await Promise.all([fetchMyRooms(), fetchPendingInvitations(false)]);
});

ui.navCreateBtn.addEventListener('click', () => {
    clearErrors();
    clearStatus();
    showView('create');
});

ui.navJoinBtn.addEventListener('click', () => {
    clearErrors();
    clearStatus();
    showView('join');
});

ui.cancelCreateBtn.addEventListener('click', () => showView('hub'));
ui.cancelJoinBtn.addEventListener('click', () => showView('hub'));
ui.cancelInviteBtn.addEventListener('click', () => showView('chat'));

ui.roomInfoBtn.addEventListener('click', openManageView);
ui.openManageBtn.addEventListener('click', openManageView);
ui.copyInviteBtn.addEventListener('click', copyInviteCode);
ui.refreshMembersBtn.addEventListener('click', () => loadMembers());
ui.leaveRoomBtn.addEventListener('click', leaveRoom);
ui.deleteRoomBtn.addEventListener('click', deleteRoom);
ui.refreshInvitationsBtn.addEventListener('click', () => fetchPendingInvitations());
ui.refreshRequestsBtn.addEventListener('click', () => loadJoinRequests());

document.getElementById('submit-create-btn').addEventListener('click', async () => {
    clearErrors();
    clearStatus();

    const name = ui.createName.value.trim();
    const description = ui.createDesc.value.trim();
    if (!name) {
        showError('create-error', 'Room name is required.');
        return;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/create`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, description })
        });

        if (!res.ok) {
            showError('create-error', await getErrorMessage(res, 'Failed to create room'));
            return;
        }

        const room = await res.json();
        ui.createName.value = '';
        ui.createDesc.value = '';
        await selectRoom(room);
    } catch (error) {
        showError('create-error', getNetworkErrorMessage(error));
    }
});

document.getElementById('submit-join-btn').addEventListener('click', async () => {
    clearErrors();
    clearStatus();

    const inviteCode = ui.joinCode.value.trim();
    if (!inviteCode) {
        showError('join-error', 'Invite code is required.');
        return;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/join`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ invite_code: inviteCode })
        });

        if (!res.ok) {
            showError('join-error', await getErrorMessage(res, 'Failed to request join'));
            return;
        }

        const data = await res.json();
        ui.joinCode.value = '';
        showView('hub');
        setStatus('hub-status', data.message || 'Join request sent.');
        await fetchMyRooms();
    } catch (error) {
        showError('join-error', getNetworkErrorMessage(error));
    }
});

document.getElementById('submit-invite-btn').addEventListener('click', async () => {
    clearErrors();
    clearStatus();

    if (!activeRoom) {
        showError('invite-error', 'Open a room first.');
        return;
    }

    const target = ui.inviteUsername.value.trim();
    if (!target) {
        showError('invite-error', 'Username is required.');
        return;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/invite`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ target_username: target })
        });

        if (!res.ok) {
            showError('invite-error', await getErrorMessage(res, 'Could not send invitation'));
            return;
        }

        const data = await res.json();
        ui.inviteUsername.value = '';
        setStatus('action-status', data.message || 'Invitation sent.');
    } catch (error) {
        showError('invite-error', getNetworkErrorMessage(error));
    }
});

ui.sendMsgBtn.addEventListener('click', async () => {
    const text = ui.chatInput.value.trim();
    if (!text || !activeRoom) {
        return;
    }

    setStatus('chat-error', '');
    ui.chatInput.value = '';

    try {
        const res = await fetchWithTimeout(`${API_BASE}/${activeRoom}/messages`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ content: text })
        });

        if (!res.ok) {
            setStatus('chat-error', await getErrorMessage(res, 'Failed to send message'));
            return;
        }

        await loadMessages();
    } catch (error) {
        setStatus('chat-error', getNetworkErrorMessage(error));
    }
});

ui.chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        ui.sendMsgBtn.click();
    }
});

ui.sidebarToggle.addEventListener('click', () => {
    ui.sidebar.classList.toggle('collapsed');
});

if (ui.mobileMenuBtn) {
    ui.mobileMenuBtn.addEventListener('click', openMobileSidebar);
}

if (ui.mobileCloseBtn) {
    ui.mobileCloseBtn.addEventListener('click', closeMobileSidebar);
}

if (ui.sidebarOverlay) {
    ui.sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeMobileSidebar();
    }
});

window.onload = async () => {
    showView('hub');
    await Promise.all([fetchMyRooms(), fetchPendingInvitations(false)]);
};
