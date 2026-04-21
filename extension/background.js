// ============================================================
// FocusRoom Enforcer — background.js (Service Worker)
// The brain. Handles WebSocket, blocking rules, tab limits,
// session state, and all inter-component messaging.
// ============================================================

import { io } from './socket.io.js';

// ── Constants ────────────────────────────────────────────────
const NODE_BACKEND   = 'http://localhost:3000';
const RULESET_ID     = 'distraction_blocklist';
const MAX_TABS       = 5;
const RECONNECT_DELAY_MS = 5000;
const SESSION_TIMEOUT_MIN = 90; // hard safety cap

// Rule IDs in rules.json (1–30). We enable/disable the whole set.
const ALL_RULE_IDS = Array.from({ length: 30 }, (_, i) => i + 1);

// ── State ────────────────────────────────────────────────────
let socket = null;
let sessionActive = false;
let reconnectTimer = null;

// ── Storage helpers ──────────────────────────────────────────
function saveState(patch) {
  return chrome.storage.local.set(patch);
}

function loadState() {
  return chrome.storage.local.get([
    'sessionActive',
    'sessionStartTime',
    'sessionDuration',
    'focusElo',
    'roomId',
    'userId',
    'roadmap',
    'focusScore',
    'socketConnected',
    'distractionCount'
  ]);
}

// ── Blocking ─────────────────────────────────────────────────
async function enableBlocking() {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [RULESET_ID]
    });
    await saveState({ sessionActive: true, sessionStartTime: Date.now() });
    sessionActive = true;
    broadcastToUI({ type: 'SESSION_STATE', active: true });
    console.log('[Enforcer] Blocking ENABLED');
  } catch (err) {
    console.error('[Enforcer] Failed to enable blocking:', err);
  }
}

async function disableBlocking() {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: [RULESET_ID]
    });
    await saveState({ sessionActive: false });
    sessionActive = false;
    broadcastToUI({ type: 'SESSION_STATE', active: false });
    console.log('[Enforcer] Blocking DISABLED');
  } catch (err) {
    console.error('[Enforcer] Failed to disable blocking:', err);
  }
}

// ── Tab Enforcement ──────────────────────────────────────────
async function enforcTabLimit() {
  if (!sessionActive) return;

  const tabs = await chrome.tabs.query({});
  if (tabs.length > MAX_TABS) {
    // Close the most recently opened excess tabs (keep first MAX_TABS)
    const excess = tabs.slice(MAX_TABS);
    for (const tab of excess) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (_) { /* tab may already be closed */ }
    }

    chrome.notifications.create('tab_limit', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FocusRoom — Tab Limit Enforced',
      message: `You opened too many tabs. Only ${MAX_TABS} tabs allowed during a focus session.`,
      priority: 2
    });

    console.log(`[Enforcer] Closed ${excess.length} excess tab(s). Limit: ${MAX_TABS}`);
  }
}

// ── Focus Score ──────────────────────────────────────────────
async function decrementFocusScore(reason = 'distraction') {
  const data = await loadState();
  const current = data.focusScore ?? 100;
  const distractionCount = (data.distractionCount ?? 0) + 1;
  const newScore = Math.max(0, current - 5);

  await saveState({ focusScore: newScore, distractionCount });
  broadcastToUI({ type: 'FOCUS_UPDATE', score: newScore, reason, distractionCount });

  console.log(`[Enforcer] Focus score: ${current} → ${newScore} (reason: ${reason})`);
}

// ── WebSocket ─────────────────────────────────────────────────
function connectSocket() {
  if (socket?.connected) return;

  console.log('[Enforcer] Connecting to backend WebSocket...');

  socket = io(NODE_BACKEND, {
    transports: ['websocket'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: RECONNECT_DELAY_MS,
    timeout: 10000
  });

  socket.on('connect', async () => {
    console.log('[Enforcer] Socket connected:', socket.id);
    await saveState({ socketConnected: true });
    broadcastToUI({ type: 'SOCKET_STATUS', connected: true });

    // Re-sync session state on reconnect
    const data = await loadState();
    if (data.sessionActive) {
      socket.emit('extension_reconnected', {
        roomId: data.roomId,
        userId: data.userId
      });
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.on('disconnect', async (reason) => {
    console.warn('[Enforcer] Socket disconnected:', reason);
    await saveState({ socketConnected: false });
    broadcastToUI({ type: 'SOCKET_STATUS', connected: false, reason });
  });

  socket.on('connect_error', (err) => {
    console.error('[Enforcer] Socket connection error:', err.message);
    broadcastToUI({ type: 'SOCKET_STATUS', connected: false, reason: err.message });
  });

  // ── Session Events from Backend ──────────────────────────
  socket.on('timer_start', async (data) => {
    console.log('[Enforcer] timer_start received', data);
    await saveState({
      roomId: data.roomId ?? null,
      userId: data.userId ?? null,
      sessionDuration: data.duration ?? 45,
      roadmap: data.roadmap ?? null,
      focusScore: 100,
      distractionCount: 0
    });
    await enableBlocking();
    // Safety alarm — auto-disable after SESSION_TIMEOUT_MIN
    chrome.alarms.create('session_safety_timeout', {
      delayInMinutes: SESSION_TIMEOUT_MIN
    });
    broadcastToUI({ type: 'TIMER_START', ...data });
  });

  socket.on('timer_pause', async (data) => {
    console.log('[Enforcer] timer_pause received', data);
    // Camera AI caught a distraction — penalise score but keep blocking
    await decrementFocusScore(data.reason ?? 'camera_distraction');
    broadcastToUI({ type: 'TIMER_PAUSE', ...data });

    chrome.notifications.create('distraction_caught', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FocusRoom — Distraction Detected!',
      message: 'Camera AI caught you. Get back on track. Focus score docked.',
      priority: 2
    });
  });

  socket.on('timer_end', async (data) => {
    console.log('[Enforcer] timer_end received', data);
    await disableBlocking();
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { url: "http://localhost:5173/dashboard" });
  }
});
    chrome.alarms.clear('session_safety_timeout');

    // Update ELO if server sends new value
    if (data.newElo !== undefined) {
      await saveState({ focusElo: data.newElo });
    }

    broadcastToUI({ type: 'TIMER_END', ...data });

    chrome.notifications.create('session_complete', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FocusRoom — Session Complete!',
      message: `Great work! Your focus score: ${data.focusScore ?? '—'}. ELO updated.`,
      priority: 2
    });
  });

  socket.on('focus_update', async (data) => {
    // Score update from server (authoritative — overrides local calculation)
    if (data.score !== undefined) {
      await saveState({ focusScore: data.score });
    }
    broadcastToUI({ type: 'FOCUS_UPDATE', ...data });
  });

  socket.on('room_state', async (data) => {
    broadcastToUI({ type: 'ROOM_STATE', ...data });
  });

  socket.on('distraction_flag', async (data) => {
    if (data.self) {
      await decrementFocusScore('server_flag');
    }
    broadcastToUI({ type: 'DISTRACTION_FLAG', ...data });
  });
}

// ── Broadcast to all extension pages ─────────────────────────
function broadcastToUI(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners open — that's fine (popup/newtab may be closed)
  });
}

// ── Message handler (from popup, newtab, content scripts) ────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      case 'MANUAL_START': {
        await saveState({
          roomId: message.roomId ?? 'local',
          userId: message.userId ?? 'local_user',
          sessionDuration: message.duration ?? 45,
          focusScore: 100,
          distractionCount: 0
        });
        await enableBlocking();
        chrome.alarms.create('session_safety_timeout', {
          delayInMinutes: message.duration ?? SESSION_TIMEOUT_MIN
        });
        if (socket?.connected) {
          socket.emit('extension_manual_start', { duration: message.duration });
        }
        sendResponse({ ok: true });
        break;
      }

      case 'MANUAL_STOP': {
        await disableBlocking();
        chrome.alarms.clear('session_safety_timeout');
        if (socket?.connected) {
          socket.emit('extension_manual_stop', {});
        }
        sendResponse({ ok: true });
        break;
      }

      case 'GET_STATE': {
        const state = await loadState();
        const enabled = await chrome.declarativeNetRequest
          .getEnabledRulesets()
          .catch(() => []);
        sendResponse({
          ...state,
          blockingActive: enabled.includes(RULESET_ID),
          socketConnected: socket?.connected ?? false
        });
        break;
      }

      case 'GET_SOCKET_STATUS': {
        sendResponse({ connected: socket?.connected ?? false });
        break;
      }

      case 'REPORT_DISTRACTION': {
        // From content script or newtab
        await decrementFocusScore(message.reason ?? 'manual');
        if (socket?.connected) {
          const data = await loadState();
          socket.emit('report_distraction', {
            userId: data.userId,
            roomId: data.roomId,
            reason: message.reason
          });
        }
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  return true; // Keep message channel open for async sendResponse
});

// ── Tab limit listener ────────────────────────────────────────
chrome.tabs.onCreated.addListener(() => {
  enforcTabLimit();
});

// ── Alarm handler ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'session_safety_timeout') {
    console.warn('[Enforcer] Safety timeout reached — disabling blocking');
    await disableBlocking();
    chrome.notifications.create('safety_timeout', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FocusRoom — Session Timed Out',
      message: 'Your session has been automatically ended. Blocking disabled.',
      priority: 1
    });
  }
});

// ── Startup ───────────────────────────────────────────────────
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Enforcer] Extension startup');
  // Restore blocking state if a session was active before browser restart
  const data = await loadState();
  if (data.sessionActive) {
    sessionActive = true;
    // Don't re-enable blocking automatically on restart — safer to require re-join
    await saveState({ sessionActive: false });
  }
  connectSocket();
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Enforcer] Installed/Updated:', details.reason);
  // Initialise default storage values
  await saveState({
    sessionActive: false,
    focusElo: 1000,
    focusScore: 100,
    distractionCount: 0,
    socketConnected: false
  });
  connectSocket();
});

// Connect socket immediately when service worker is first loaded
connectSocket();
