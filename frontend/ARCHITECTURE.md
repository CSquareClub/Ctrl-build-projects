# System Architecture - FocusRoom

## Layered Architecture Diagram

```text
+------------------------------------------------------------------------------------+
|                                  FOCUSROOM SYSTEM                                  |
|                     Study Productivity + Live Rooms + AI Assistant                 |
+------------------------------------------------------------------------------------+

+------------------------------------------------------------------------------------+
|                                   FRONTEND LAYER                                  |
|                              React + TypeScript + Vite                             |
|                              Runtime: Browser SPA                                  |
+------------------------------------------------------------------------------------+
                                       |
                                       | Route Navigation (React Router)
                                       v
        +-------------------+--------------------+-------------------+------------------+
        |                   |                    |                   |                  |
  +------------+     +-------------+      +-------------+      +------------+    +------------+
  | Dashboard  |     | StudyPlanner|      | Smart Rooms |      | AI Assistant|    | ArcadeMode |
  +------------+     +-------------+      +-------------+      +------------+    +------------+
        |                   |                    |                   |                  |
        +-------------------+--------------------+-------------------+------------------+
                                       |
                                       | Calls hooks/services
                                       v
+------------------------------------------------------------------------------------+
|                                 APPLICATION LAYER                                  |
| components/      context/      hooks/      features/      pages/      lib/theme   |
| - Sidebar        - AuthContext - useRooms  - planner       - route pages - theme   |
| - Theme toggle   - Protected   - useRoomMembers            orchestration  sync      |
+------------------------------------------------------------------------------------+
                                       |
                    +------------------+-------------------+---------------------+
                    |                                      |                     |
                    v                                      v                     v
          +----------------------+              +--------------------+   +----------------------+
          |  FIREBASE SERVICES   |              |  LOCAL SERVICES    |   |   EXTERNAL SERVICE   |
          |  Auth + Firestore    |              |  localStorage      |   |   Gemini API         |
          +----------------------+              +--------------------+   +----------------------+
                    |                                      |                     |
                    v                                      v                     v
      +--------------------------------+     +----------------------------+   +------------------+
      | rooms collection               |     | planner tasks (local)      |   | chat completions |
      | rooms/{roomId}/members         |     | arcade sessions (local)    |   | AI responses     |
      | sessions and records           |     | theme preference            |   |                  |
      +--------------------------------+     +----------------------------+   +------------------+
```

## Request/Data Flow (High Level)

```text
User Interaction
   |
   v
Page Component (src/pages/*)
   |
   v
Hook (src/hooks/* or src/features/*)
   |
   v
Service (src/services/*)
   |
   +--> Firestore/Auth (realtime via onSnapshot where needed)
   +--> localStorage (planner timers, arcade records, theme)
   +--> Gemini API (AI assistant)
```

## Route Topology

```text
Public:
  /
  /login
  /signup

Protected:
  /dashboard
  /study-planner
  /smart-room
  /focus-rooms
  /room/:id
  /nearby-educators
  /analytics-leaderboard
  /ai-assistant
  /arcade-mode
  /records
```

## Core Domains

### 1) Authentication Domain
- Provider: src/context/AuthContext.tsx
- Source: Firebase Auth (`onAuthStateChanged`)
- Used by protected routes and identity-aware features

### 2) Smart Room Domain
- Service: src/services/rooms.ts
- Hooks: src/hooks/useRooms.ts, src/hooks/useRoomMembers.ts
- Firestore model:
  - rooms
  - rooms/{roomId}/members
- Behavior:
  - realtime room listing
  - realtime member list
  - join/leave with duplicate-prevention by member doc id = user.uid

### 3) Study Planner Domain (Local First)
- Feature module: src/features/planner/*
- Persistence: localStorage
- Timer model: timestamp-based, page-refresh safe
- Single active timer engine

### 4) AI Assistant Domain
- Service: src/services/gemini.ts
- Page: src/pages/AiAssistant.tsx
- Flow: prompt -> service -> Gemini -> response render

### 5) Arcade Domain
- Page: src/pages/ArcadeMode.tsx
- Service: src/services/arcadeSessions.ts
- Supports score, leaderboard, and session persistence

## Theming and UI System

```text
Theme Source: src/lib/theme.ts
  -> getStoredTheme / setTheme / subscribeTheme / applyTheme

Startup Sync: src/components/ThemeSync.tsx
Global Toggle: src/components/GlobalThemeToggle.tsx

Design Tokens: src/index.css
  --bg, --card, --bg-elev, --border, --text, --muted, --accent
```

All major pages are styled against shared CSS variables for consistent dark/light behavior.

## Folder Blueprint

```text
src/
  components/
  components/ui/
  components/sections/
  context/
  features/
    planner/
  hooks/
  lib/
  mock/
  pages/
  services/
  App.tsx
  AppRouter.tsx
  main.tsx
  index.css
```

## Operational Notes
- Architecture style: modular SPA with domain-oriented services and hooks.
- Realtime data: Firestore listeners for rooms/members.
- Local-first data: planner and arcade persistent state via localStorage.
- Error strategy: service-level normalized errors and page-level fallback views.
- Deployment target: static Vite build (`dist`) with SPA rewrites.
