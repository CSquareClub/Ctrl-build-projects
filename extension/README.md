# FocusRoom — The Enforcer (Chrome Extension)

A Manifest V3 Chrome Extension that acts as the discipline layer for the FocusRoom AI ecosystem.

## Features

- **Dynamic Site Blocking** — 30 distraction sites blocked via `declarativeNetRequest`, toggled on/off by session state
- **WebSocket Backend Sync** — connects to Node.js backend (port 3000) and listens for `timer_start`, `timer_pause`, `timer_end` events
- **5-Tab Limit Enforcement** — automatically closes excess tabs during sessions
- **Custom New Tab Dashboard** — shows ELO, focus score, live timer, AI roadmap, and room members
- **Toolbar Popup** — manual start/stop for when the backend is offline
- **Blocked Page** — stylised redirect with motivational quote and session timer
- **Focus Score Tracking** — deducts 5 points per distraction flag from camera AI
- **Safety Timeout** — auto-disables blocking after 90 minutes via Chrome Alarms API

## File Structure

```
focusroom-extension/
├── manifest.json       # Extension config, permissions, ruleset declaration
├── rules.json          # 30-site static blocklist for declarativeNetRequest
├── background.js       # Service Worker — WebSocket, blocking, tab limit, state
├── newtab.html         # Custom new tab page (dashboard)
├── newtab.js           # Dashboard logic — real-time state rendering
├── popup.html          # Toolbar popup UI
├── popup.js            # Popup logic — manual controls, live status
├── blocked.html        # Page shown when a site is blocked
└── icons/              # icon16.png, icon32.png, icon48.png, icon128.png
```

## Setup

### 1. Add icons
Create an `icons/` folder and add placeholder PNG icons:
- `icon16.png` (16×16)
- `icon32.png` (32×32)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

You can use any image editor or generate with a script. For hackathon: one simple icon at 128px and Chrome will scale it.

### 2. Load in Chrome
1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `focusroom-extension/` folder
5. The extension appears in your toolbar

### 3. Backend integration
The extension connects to `http://localhost:3000` via Socket.io.

Your Node.js backend must emit these events to the extension socket:

```js
// Start a session
io.emit('timer_start', {
  roomId: 'room_abc',
  userId: 'user_123',
  duration: 45,          // minutes
  roadmap: [             // optional
    { phase: '0-15m', task: 'Review BST theory', duration_min: 15 },
    { phase: '15-35m', task: 'Code first two problems', duration_min: 20 },
    { phase: '35-45m', task: 'Debug and optimize', duration_min: 10 }
  ]
});

// Camera AI caught a distraction
io.emit('timer_pause', {
  userId: 'user_123',
  reason: 'camera_distraction'   // or 'phone_detected', 'face_absent'
});

// Session complete
io.emit('timer_end', {
  focusScore: 80,
  newElo: 1050
});
```

The extension also emits back to your backend:
```js
socket.on('extension_reconnected', ({ roomId, userId }) => { ... });
socket.on('extension_manual_start', ({ duration }) => { ... });
socket.on('extension_manual_stop', () => { ... });
socket.on('report_distraction', ({ userId, roomId, reason }) => { ... });
```

### 4. Manual mode (no backend)
If the backend is offline, use the popup (toolbar icon) to manually start/stop sessions. All features work — blocking, tab limit, focus scoring — except real-time room sync.

## WebSocket Events Reference

| Direction | Event | Payload |
|---|---|---|
| Backend → Extension | `timer_start` | `{ roomId, userId, duration, roadmap? }` |
| Backend → Extension | `timer_pause` | `{ userId, reason }` |
| Backend → Extension | `timer_end` | `{ focusScore, newElo }` |
| Backend → Extension | `focus_update` | `{ userId, score }` |
| Backend → Extension | `room_state` | `{ members[] }` |
| Backend → Extension | `distraction_flag` | `{ userId, self: bool }` |
| Extension → Backend | `extension_reconnected` | `{ roomId, userId }` |
| Extension → Backend | `report_distraction` | `{ userId, roomId, reason }` |
| Extension → Backend | `extension_manual_start` | `{ duration }` |
| Extension → Backend | `extension_manual_stop` | `{}` |

## Chrome Storage Schema

```js
{
  sessionActive: boolean,
  sessionStartTime: number,    // Date.now() timestamp
  sessionDuration: number,     // minutes
  focusElo: number,            // default 1000
  focusScore: number,          // 0–100
  distractionCount: number,
  roomId: string | null,
  userId: string | null,
  roadmap: Array | null,
  socketConnected: boolean
}
```

## Adding More Blocked Sites

Edit `rules.json` — add a new object with the next `id` (31, 32, …):

```json
{
  "id": 31,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "extensionPath": "/blocked.html" }
  },
  "condition": {
    "urlFilter": "||newsite.com^",
    "resourceTypes": ["main_frame", "sub_frame"]
  }
}
```

Reload the extension after editing `rules.json`.

## Notes for Hackathon

- The `socket.io-client` import in `background.js` uses the CDN ESM build. If the venue has no internet, download it locally and update the import path.
- The extension **requires** the backend to be running for WebSocket features. Manual mode is the fallback.
- `declarativeNetRequest` rules are disabled by default — they activate only when a session starts.
- The 5-tab limit only enforces during active sessions.
