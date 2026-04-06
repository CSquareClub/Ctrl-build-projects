# Execution Checklist: Whiteboard Module v2.0

## Phase 1: Clean Slate Scaffolding & Setup
- [ ] Ensure we are in a fresh Next.js project directory. (If not, prompt the user to run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`).
- [ ] Install the strictly approved dependencies: 
      `npm install @tldraw/tldraw @liveblocks/client @liveblocks/react @liveblocks/yjs yjs`
- [ ] Ensure `tsconfig.json` and `tailwind.config.ts` are properly set up for a standard Next.js App Router project.
- [ ] Commit: `chore: initialize clean slate architecture and install tldraw/liveblocks`

## Phase 2: Liveblocks Core Configuration
- [ ] Create a new file at `src/liveblocks.config.ts`.
- [ ] Import `createClient` from `@liveblocks/client` and `createRoomContext` from `@liveblocks/react`.
- [ ] Initialize the client with a placeholder `publicApiKey` (e.g., `"pk_placeholder_key_here"`). Add a comment instructing the user to replace this later.
- [ ] Export the generated hooks and providers: `LiveblocksProvider`, `RoomProvider`, `useRoom`, `useSelf`, `useOthers`.
- [ ] Commit: `feat: configure centralized liveblocks client`

## Phase 3: The Canvas Engine (`Editor.tsx`)
- [ ] Create directory `src/components/Whiteboard/`.
- [ ] Create `src/components/Whiteboard/Editor.tsx`.
- [ ] Add `"use client";` at the top.
- [ ] Import `Tldraw` and `@tldraw/tldraw/tldraw.css`.
- [ ] Import `* as Y` from `yjs` and `LiveblocksYjsProvider` from `@liveblocks/yjs`.
- [ ] Import `useRoom` from `src/liveblocks.config.ts`.
- [ ] Inside the component, initialize a `Y.Doc` and bind it to the Liveblocks room using a `useEffect`. Ensure the cleanup function destroys the ydoc and provider.
- [ ] Render the `<Tldraw>` component.
- [ ] **CRITICAL:** Wrap the `<Tldraw>` component in a `<div>` with `className="absolute inset-0"`. Do not use any other height/width CSS.
- [ ] Commit: `feat: implement tldraw engine with yjs sync bridge`

## Phase 4: The Room Wrapper (`CollaborativeCanvas.tsx`)
- [ ] Create `src/components/Whiteboard/CollaborativeCanvas.tsx`.
- [ ] Add `"use client";` at the top.
- [ ] Import `RoomProvider` from `src/liveblocks.config.ts`.
- [ ] Import `ClientSideSuspense` from `@liveblocks/react`.
- [ ] Import the `Editor` component created in Phase 3.
- [ ] Create a component that accepts a `roomId: string` prop.
- [ ] Wrap the `Editor` in `<RoomProvider id={roomId} initialPresence={{ cursor: null }}>` and `<ClientSideSuspense fallback={<div>Loading Room...</div>}>`.
- [ ] Commit: `feat: implement liveblocks room wrapper and suspense boundaries`

## Phase 5: Routing & Integration Testing
- [ ] Update `src/app/globals.css` to ensure the `html` and `body` have `margin: 0`, `padding: 0`, `height: 100%`, and `overflow: hidden`.
- [ ] Create a dynamic route folder structure: `src/app/room/[roomId]/page.tsx`.
- [ ] In `src/app/room/[roomId]/page.tsx`, extract the `roomId` from the URL parameters and pass it to `<CollaborativeCanvas roomId={params.roomId} />`.
- [ ] Update the main `src/app/page.tsx` to act as a redirect or link to a default test room (e.g., `/room/test-study-room`).
- [ ] Commit: `feat: wire up dynamic routing for isolated study rooms`