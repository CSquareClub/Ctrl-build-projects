# System Architecture: Smart Student Study Manager (Whiteboard Module)

## 1. Architectural Philosophy: Cloud-Delegated Synchronization
To achieve zero-local-load and absolute stability, this application follows a **Cloud-Delegated Sync** architecture. 
* The local Next.js server is strictly a UI delivery mechanism. It does **not** process, route, or store real-time WebSocket data.
* All CRDT (Conflict-free Replicated Data Type) calculations, room management, and presence data (cursors) are delegated to the Liveblocks Edge Network.
* The `tldraw` engine acts as a purely reactive view layer that binds to the Liveblocks Yjs adapter.

## 2. Core Data Flow (The Integration Loop)
The real-time sync mechanism relies on a specific sequence of adapters to connect `tldraw` to Liveblocks without memory leaks:

1. **User Action:** A user draws a stroke on the `<Tldraw>` canvas.
2. **Local Store Update:** `tldraw` updates its internal reactive store.
3. **Yjs Bridge:** We use a custom sync hook to pipe the `tldraw` store changes into a local `Y.Doc` (from the `yjs` package).
4. **Liveblocks Adapter:** The `@liveblocks/yjs` provider intercepts the `Y.Doc` changes.
5. **Edge Broadcast:** Liveblocks automatically transmits the CRDT diffs over its managed WebSockets to all other clients in the exact same `roomId`.
6. **Remote Sync:** Remote clients receive the diffs, update their local `Y.Doc`, which pushes the update into their `tldraw` store, rendering the new stroke seamlessly.

## 3. Strict Directory Structure
To ensure this module can be cleanly merged into the larger dashboard later, the AI agent must adhere strictly to this file hierarchy:

```text
src/
├── app/
│   ├── globals.css                   # Tailwind imports and minimal global resets
│   ├── page.tsx                      # Landing page (redirects to a test room)
│   └── room/
│       └── [roomId]/
│           └── page.tsx              # Dynamic route injecting roomId into the canvas
├── components/
│   └── Whiteboard/
│       ├── CollaborativeCanvas.tsx   # Liveblocks RoomProvider & Suspense boundaries
│       └── Editor.tsx                # The actual <Tldraw> wrapper and Yjs sync logic
└── liveblocks.config.ts              # Centralized Liveblocks client & hooks
```

## 4. Component Boundaries & Responsibilities

### `liveblocks.config.ts`

- **Responsibility:** Initializes the `createClient` using the public API key.
- **Exports:** Generates and exports strictly typed hooks (`useRoom`, `useSelf`, `useOthers`) and the `RoomProvider` context.

### `CollaborativeCanvas.tsx` (The Wrapper)

- **Responsibility:** Acts as the isolation boundary. It takes a `roomId` prop and wraps its children in the `<RoomProvider id={roomId}>`.
- **Network Handling:** Must utilize `<ClientSideSuspense>` to handle loading states while the Liveblocks WebSocket connects, preventing hydration mismatch errors on the Next.js server.

### `Editor.tsx` (The Engine)

- **Responsibility:** Mounts the `<Tldraw>` component.
- **Layout Constraints (CRITICAL):** To prevent the `Canvas exceeds max size` geometry explosion that occurs during hot-reloads, the parent `<div>` wrapping the `<Tldraw>` component must use strict viewport bounds.
    - **Mandatory CSS:** `absolute inset-0` or `width: 100vw; height: 100vh; overflow: hidden;`. No relative sizing is permitted.
- **Sync Logic:** Manages the `Y.Doc` and `LiveblocksYjsProvider` lifecycle within a `useEffect`, carefully returning a cleanup function (`provider.destroy()`, `ydoc.destroy()`) to prevent ghost connections.

## 5. Security & Authentication Strategy (Current vs. Future)

- **MVP Phase (Current):** Uses a `publicApiKey` for Liveblocks to maximize hackathon development velocity. Anyone with the room URL can connect.
- **Production Phase (Future):** The architecture is designed so that the `publicApiKey` can be swapped for an `authEndpoint` (e.g., `/api/liveblocks-auth`). This will securely tie the room access to the Study Manager's Google OAuth tokens without needing to rewrite the frontend components.