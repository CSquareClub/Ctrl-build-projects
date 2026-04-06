# FocusRoom

FocusRoom is a React + TypeScript + Vite app for study sessions, smart rooms, flashcard-style learning, and productivity tracking.

## Features

- Protected dashboard and auth flow
- Smart focus rooms with session tracking
- Session history and records
- Sidebar navigation for planner, AI helper, mentors, and arcade mode
- Firebase-backed data layer with resilient local fallbacks

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Firebase Auth and Firestore

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview the production build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file if your Firebase project needs local configuration. The app expects Firebase configuration inside the client setup in `src/lib/firebase.ts`.

For the AI Assistant chat, add your Gemini key as:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

You can copy `.env.example` to `.env.local` and fill in your own key for local development.

## Deployment on Vercel

This project is configured for Vercel with `vercel.json`.

- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: handled by rewrite to `index.html`

Deploy by connecting the repository to Vercel or using the Vercel CLI.

## Notes

- Routes are protected where needed.
- Some sections use fallback content when Firestore permissions are restricted.
- The app is built as a single-page application, so route rewrites are required in production hosting.
