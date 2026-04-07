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

Create a local environment file:

```bash
cp .env.example .env.local
```

Firebase integration is fully configured through environment variables (no hardcoded client config). Add the following values from your Firebase project settings:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_optional
```

These variables are read in `src/lib/firebase.ts`.

API keys used by the frontend app:

```bash
# Firebase Web API key (from Firebase project settings)
VITE_FIREBASE_API_KEY=your_firebase_api_key
```

For the AI Assistant chat, run the backend proxy and set Gemini key in `backend/.env`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

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
