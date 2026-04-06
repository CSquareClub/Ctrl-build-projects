# Integration Contract: Whiteboard <-> Chatbot

## 1. The Boundary Principle
The Whiteboard Module and the Chatbot Module must remain completely ignorant of each other's internal logic. They will only communicate through a shared Parent Layout and a shared `roomId`.

## 2. The Component API
When integrating the whiteboard into the main study dashboard, the Chatbot UI will render the whiteboard using this exact component signature:

```tsx
<CollaborativeCanvas roomId={currentStudySessionId} />
```

**Constraint:** The Whiteboard must NEVER accept props related to chat history, LLM context, or user profiles. It only accepts the `roomId`.

## 3. Layout Integration Rules (CRITICAL)

When placing the Chatbot and Whiteboard side-by-side, the agent must obey strict CSS flexbox rules to prevent `tldraw` geometry crashes.

**Correct Integration Layout:**

```tsx
<div className="flex h-screen w-screen overflow-hidden bg-gray-50">
  {/* Left: Whiteboard Container (Strictly constrained) */}
  <div className="relative flex-grow h-full border-r border-gray-200">
    <CollaborativeCanvas roomId={activeRoom} />
  </div>

  {/* Right: Chatbot Container */}
  <div className="w-96 flex-shrink-0 h-full flex flex-col">
    <ChatInterface roomId={activeRoom} />
  </div>
</div>
```

## 4. Environment Merge Protocol

When merging the repositories, the agent must combine the `.env.local` files securely:

- **Whiteboard Needs:** `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`
- **Chatbot Needs:** (e.g., `OPENAI_API_KEY`, `SUPABASE_URL`)
- **Rule:** Never expose the LLM keys to the client. Only Liveblocks gets the `NEXT_PUBLIC_` prefix during the MVP phase.

## 5. Event Handling (Post-MVP)

If the AI Chatbot needs to "see" the whiteboard later, it will not read the canvas directly. Instead:

1. `tldraw` exports a base64 image/PNG.
2. The image is passed up to the Parent Layout.
3. The Parent Layout passes the image into the Chatbot's multimodal LLM prompt.