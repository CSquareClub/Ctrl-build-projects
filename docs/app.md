cd # SAIVO App Implementation Brief (Web -> App)

This file gives you a short, practical map to build the mobile app version of this project.

## 1) Login System (Start Here)

### What exists now
- Backend auth routes:
  - `POST /auth/register`
  - `POST /auth/login`
- Passwords are hashed with bcrypt.
- Frontend stores session in local storage (`userId`, `username`).

### Required flow in app
1. User enters username + password.
2. If register mode:
   - Validate minimum username length = 3.
   - Validate minimum password length = 4.
   - Call `POST /auth/register`.
3. If login mode:
   - Call `POST /auth/login`.
   - Save returned `id` + `username` in app storage.

### Critical conditions
- If backend returns `deletion_status = scheduled` on login:
  - Show warning popup.
  - Option A: call `POST /account/cancel-deletion` with `user_id` and continue login.
  - Option B: let user choose different account.
- If `deletion_status = deleted`:
  - Block login and show error.

## 2) Chat System

### What exists now
- Chat routes:
  - `POST /chats` create chat
  - `GET /chats/{user_id}` list chats (only non-deleted)
  - `DELETE /chats/{chat_id}?user_id=...` soft delete chat
  - `POST /chats/{chat_id}/cleanup?user_id=...` auto-delete empty chat
- Message routes:
  - `GET /messages/{chat_id}` list messages
  - `POST /chat/send` send message and get AI reply
  - `POST /chat/finalize` apply stop marker when user stops reply render

### Required flow in app
1. Create or select chat.
2. Load messages (`GET /messages/{chat_id}`).
3. User sends message (`POST /chat/send`).
4. Render AI response progressively (typing effect in UI if desired).
5. If user stops rendering:
   - Call `POST /chat/finalize` with:
     - `chat_id`, `user_id`, `message_id`, `full_response`, `stopped=true`, `stop_index`.
6. On chat switch/new chat/app close:
   - Call cleanup endpoint to remove blank chats.

### Critical conditions
- Stop button must only affect the active chat.
- Assistant messages may contain hidden stop marker text in DB; UI should display sanitized content only.
- Chat deletion is soft delete (`deleted_at`), not hard delete.

## 3) Database (MongoDB)

### Collections you must keep
- `users`
- `chats`
- `messages`
- `help_requests`
- `password_reset_requests`

### Core fields
- `users`:
  - `username`, `password_hash`, `created_at`
  - `deletion_status` (`none|scheduled|cancelled|deleted`)
  - `deletion_requested_at`, `last_deletion_attempt`
- `chats`:
  - `user_id`, `title`, `created_at`, `deleted_at`
- `messages`:
  - `chat_id`, `user_id`, `role` (`user|assistant`), `content`, `created_at`
  - optional runtime fields: `ai_generated`, `was_stopped`
- `help_requests`:
  - `username`, `user_id`, `problem`, `status` (`working|fixed`), `created_at`
- `password_reset_requests`:
  - `username`, `email`, `reset_token`, `status`, `created_at`, `updated_at`

## 4) AI Integration

### Current setup
- Chat reply endpoint uses Groq:
  - URL: `https://api.groq.com/openai/v1/chat/completions`
  - Key: `GROQ_API_KEY`
- Title generation uses separate key:
  - Key: `GROQ_API_KEY_TITLE`

### Rename logic
- First user message: try rule-based rename (if meaningful).
- Third user message: force AI title rename.
- Rename happens only if current title is exactly `New Chat` and chat is not deleted.

## 5) Other Features to Mirror in App

- Account deletion:
  - `POST /account/delete-request` (30-day grace period)
  - Weekly rate limit for repeated delete requests.
- Account info:
  - `GET /account/info/{user_id}`
- Help system:
  - `POST /help/submit`
  - `GET /help/status/{user_id}`
- Password reset:
  - `POST /auth/password-reset/check`
  - `POST /auth/password-reset/request`
  - `POST /auth/password-reset/verify-token`
  - `POST /auth/password-reset/reset`
  - `POST /auth/password-reset/cancel`
  - `GET /auth/password-reset/status/{username}`

## 6) Mobile App Build Order (Recommended)

1. Auth screens + secure token/session storage.
2. Chat list + create/select/delete chat.
3. Message screen + send/receive AI responses.
4. Stop/finalize behavior + empty-chat cleanup.
5. Account page (info, delete-request, cancel deletion).
6. Help request page.
7. Password reset flow.
8. Polish: retries, loading states, error toasts, offline handling.

## 7) AI-Assisted Development Prompts (Use in Copilot/LLM)

- "Create a React Native login screen that calls `/auth/login` and handles `deletion_status` branch logic."
- "Build a chat screen using `/chat/send` and `/chat/finalize` with stop-index support."
- "Generate TypeScript API client methods for all SAIVO backend endpoints."
- "Add MongoDB-backed chat list sync with soft-delete filtering and cleanup triggers."

---
If you follow sections 1 -> 2 -> 3 in order, you can rebuild this full web project as an app without missing core behavior.
