# Changelog: Whiteboard Module

## [v2.0.0] - Architecture Pivot (Current)
### Added
- Initialized fresh Next.js App Router project for the v2.0 architecture.
- Established new documentation suite (`PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PLAN.md`) to enforce the new tech stack.

### Changed
- **CRITICAL PIVOT:** Completely abandoned local WebSocket servers (PartyKit) and local rendering engines (Excalidraw).
- Transitioned to `@tldraw/tldraw` for native React canvas stability and infinite scaling without geometry crashes.
- Transitioned to `@liveblocks/react` and `@liveblocks/yjs` to offload CRDT calculations and WebSocket connections to edge servers, guaranteeing zero local memory leaks.

## [v1.0.0] - Deprecated
### Removed
- **DEPRECATED:** The entire v1.0 codebase has been purged. 
- **Reason for Deprecation:** Combining Next.js React Strict Mode / HMR with `y-partykit` and `@excalidraw/excalidraw` caused catastrophic local memory leaks (10GB+ RAM spikes) and infinite rendering loops (`Canvas exceeds max size` errors). The local hardware could not sustain the development environment.
