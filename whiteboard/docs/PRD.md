# Product Requirements Document (PRD)
**Project:** Smart Student Study Manager - Whiteboard Module (v2.0)
**Architecture:** Zero-Local-Load Cloud Sync

## 1. Product Overview & Vision
The Whiteboard Module is a core feature of the "Smart Student Study Manager." It allows multiple students to collaborate in real-time within dedicated virtual study rooms. 

**The v2.0 Pivot:** Previous iterations using local WebSockets (PartyKit) and Excalidraw resulted in catastrophic memory leaks and infinite render loops during local development. The v2.0 architecture completely outsources real-time CRDT (Conflict-free Replicated Data Type) math and WebSocket connections to edge servers (Liveblocks) and utilizes a React-native canvas engine (`tldraw`) to ensure absolute stability, zero local memory bloat, and a crash-proof development experience.

## 2. Core Tech Stack (Strictly Enforced)
* **Framework:** Next.js (App Router, React 18+)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Canvas Engine:** `@tldraw/tldraw`
* **Real-Time Engine:** `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/yjs`
* **Data Structure:** `yjs` (Used *only* as a client-side data structure for Liveblocks, never as a local server).

### 2.1 Explicit Anti-Requirements (DO NOT USE)
Under no circumstances should the following technologies be installed or utilized in this codebase:
* `@excalidraw/excalidraw` (Prone to geometry explosions).
* `partykit` or `y-partykit` (Causes local RAM spikes).
* Local Express/Node WebSocket servers.

## 3. Core Features (MVP)
The Minimum Viable Product for the Whiteboard Module must support:

1.  **Infinite Collaborative Canvas:** A limitless drawing board that scales flawlessly.
2.  **Native Tooling:** Out-of-the-box support for Pen, Eraser, Shapes (Rectangles, Ellipses), Arrows, Text, and Sticky Notes.
3.  **Real-Time Multiplayer Sync:** Millisecond-latency synchronization of strokes and shapes across multiple browser clients.
4.  **Multiplayer Presence:** Live cursor tracking (seeing where other students' mice are) and selection highlighting (seeing what other students are currently dragging/typing).
5.  **Robust Undo/Redo:** Action history that respects the CRDT state (undoing your own actions without breaking a teammate's simultaneous drawing).
6.  **Room Isolation:** The ability to dynamically load distinct, isolated canvases based on a `roomId` prop or URL parameter.

## 4. System Architecture & Constraints

### 4.1 Cloud-Delegated Processing
The local Next.js server exists *only* to serve the React components. All state synchronization must be handled by wrapping the application in a Liveblocks `<RoomProvider>`. 

### 4.2 Component Isolation
The whiteboard must be built as a modular, standalone component (`CollaborativeCanvas.tsx`). It must not rely on global Next.js state or context outside of its own Liveblocks provider. This ensures it can be cleanly imported into the main "Study Manager" dashboard later without architectural conflicts.

### 4.3 Container Geometry strictness
To prevent canvas sizing crashes, the parent container of the `<Tldraw>` component must have explicit, rigidly defined viewport dimensions (e.g., `100vw`, `100vh`) or `absolute inset-0` tailwind classes.

## 5. Future Integration Milestones (Post-MVP)
While not part of the immediate build, the architecture must leave room for:
* **Authentication:** Swapping the public Liveblocks API key for a secure authentication endpoint tied to the Study Manager's user database.
* **Persistent Storage:** Attaching database webhooks to save canvas states when a study session ends.
* **AI Vision Integration:** Allowing the "AI Tutor Module" to take snapshots of the canvas to answer student questions.