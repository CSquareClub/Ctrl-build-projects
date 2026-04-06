# Core Directives & Rules (Whiteboard Module v2.0)

## 1. The Ban List (Zero Tolerance)
Do NOT install, import, or suggest using any of the following dependencies. Using them will cause a system crash:
* `@excalidraw/excalidraw`
* `partykit`
* `y-partykit`
* `socket.io`

## 2. Strict Client-Side Rendering
Because `tldraw` and Liveblocks rely on the browser's `window` object and WebSockets, they cannot be rendered on the Next.js server.
* **Rule:** Every file inside `src/components/Whiteboard/` MUST start with the `"use client";` directive at the very top of the file.

## 3. The Geometry Mandate
Do not attempt to compute dynamic heights or use percentage-based relative heights for the canvas wrapper.
* **Rule:** The `<Tldraw>` component must be wrapped in a container with strict viewport styling (e.g., `<div className="absolute inset-0">`). If this rule is broken, the canvas engine will trigger a resize loop and crash the browser context.

## 4. Git Commit Standards
You must act as a disciplined engineer. 
* **Rule:** After successfully completing any phase from `PLAN.md`, you must execute a clean Git commit using conventional commits (e.g., `feat: integrate liveblocks room provider`).

## 5. Single Responsibility
Do not attempt to build the AI Chatbot or Dashboard logic in this workspace. 
* **Rule:** Your sole mandate is to build the isolated, crash-proof collaborative whiteboard utilizing the exact stack specified in `ARCHITECTURE.md`.