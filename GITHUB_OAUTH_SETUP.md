# GitHub OAuth Integration Implementation Guide

## Overview

This document outlines the complete GitHub OAuth integration for your OpenIssue project. The implementation includes:

- ✅ Frontend Settings page with GitHub connection UI
- ✅ Backend OAuth flow with FastAPI
- ✅ Secure token handling (server-side only)
- ✅ Repository fetching and linking
- ✅ Dashboard integration to display linked repos
- ✅ Responsive design matching your theme

## Architecture

### Backend (FastAPI + Python)

**New Files Created:**
- `backend/app/models/github_model.py` - Data models for GitHub integration
- `backend/app/services/github_service.py` - GitHub OAuth controller
- `backend/app/routes/github.py` - FastAPI routes for OAuth

**Modified Files:**
- `backend/app/main.py` - Added GitHub router
- `backend/requirements.txt` - Updated with OAuth dependencies
- `backend/.env.example` - Added OAuth environment variables

### Frontend (Vanilla JS + HTML/CSS)

**New Files Created:**
- `frontend/pages/settings.html` - Settings page with GitHub integration
- `frontend/js/githubAuth.js` - OAuth flow and repository management
- `frontend/js/dashboard.js` - Dashboard display of linked repos
- `frontend/css/github.css` - GitHub component styling

**Modified Files:**
- `frontend/pages/dashboard.html` - Added linked repositories section

## Setup Instructions

### 1. GitHub OAuth Application Setup

1. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers/oauth-apps)
2. Click "New OAuth App"
3. Fill in the form:
   - **Application Name:** OpenIssue
   - **Homepage URL:** `http://localhost:8000` (or your production URL)
   - **Authorization callback URL:** `http://localhost:8000/auth/github/callback`
4. Copy the **Client ID** and generate a **Client Secret**

### 2. Backend Configuration

#### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Key New Packages:**
- `authlib==1.3.0` - OAuth2 handling
- `requests==2.31.0` - HTTP requests
- `python-jose==3.3.0` - JWT/JWE support
- `cryptography==41.0.5` - Encryption

#### Step 2: Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_OAUTH_CALLBACK_URL=http://localhost:8000/auth/github/callback

# Frontend URLs
FRONTEND_URL=http://localhost:3000
FRONTEND_SETTINGS_URL=http://localhost:3000/pages/settings.html

# Session & Security
SECRET_KEY=your_secret_key_for_session_encryption

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

#### Step 3: Run Backend

```bash
python run.py
# or with uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Configuration

#### Update API Base URL

Edit `frontend/js/githubAuth.js` and `frontend/js/dashboard.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000'; // Update with your backend URL
```

And `frontend/js/githubAuth.js`:

```javascript
const GITHUB_REDIRECT_URI = `${window.location.origin}/pages/settings.html`;
```

### 4. Serve Frontend

```bash
# Using Python's built-in server
cd frontend
python -m http.server 3000

# Or use any other static server (nginx, Apache, etc.)
```

Visit `http://localhost:3000/pages/settings.html`

## API Endpoints

### GitHub OAuth Routes

All endpoints are prefixed with `/auth/github/`

#### 1. **GET `/auth/github`**
Start OAuth flow - returns authorization URL

```bash
GET /auth/github/auth/github?redirect_uri=http://localhost:3000/pages/settings.html

Response:
{
  "auth_url": "https://github.com/login/oauth/authorize?...",
  "state": "random_state_token"
}
```

#### 2. **POST `/auth/github/callback`**
Exchange authorization code for token

```bash
POST /auth/github/auth/github/callback

Request:
{
  "code": "github_auth_code",
  "redirect_uri": "http://localhost:3000/pages/settings.html",
  "user_id": "user_123"
}

Response:
{
  "status": "success",
  "user_id": "user_123",
  "github_username": "octocat",
  "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
  "profile_url": "https://github.com/octocat"
}
```

#### 3. **GET `/repos`**
Fetch user's GitHub repositories

```bash
GET /auth/github/repos?user_id=user_123

Response:
{
  "status": "success",
  "count": 42,
  "repositories": [
    {
      "id": 123456,
      "name": "awesome-project",
      "url": "https://github.com/user/awesome-project",
      "description": "An awesome project",
      "is_private": false,
      "stars": 150,
      "forks": 30,
      "language": "Python",
      "updated_at": "2024-01-15T10:30:00Z",
      "topics": ["python", "ml"]
    }
  ]
}
```

#### 4. **POST `/save-repos`**
Save selected repositories

```bash
POST /auth/github/save-repos

Request:
{
  "user_id": "user_123",
  "repos": [
    {
      "id": 123456,
      "name": "awesome-project",
      "url": "https://github.com/user/awesome-project",
      "is_private": false,
      "stars": 150
    }
  ]
}

Response:
{
  "status": "success",
  "message": "Saved 1 repositories",
  "saved_count": 1
}
```

#### 5. **GET `/linked-repos`**
Get user's linked repositories

```bash
GET /auth/github/linked-repos?user_id=user_123

Response:
{
  "status": "success",
  "count": 1,
  "repositories": [
    {
      "repo_id": 123456,
      "name": "awesome-project",
      "url": "https://github.com/user/awesome-project",
      "is_private": false,
      "stars": 150,
      "last_updated": "2024-01-15T10:30:00"
    }
  ]
}
```

#### 6. **DELETE `/linked-repos/{repo_id}`**
Unlink a repository

```bash
DELETE /auth/github/linked-repos/123456?user_id=user_123

Response:
{
  "status": "success",
  "message": "Repository unlinked successfully"
}
```

#### 7. **POST `/refresh-repos`**
Refresh repository list

```bash
POST /auth/github/refresh-repos?user_id=user_123

Response:
{
  "status": "success",
  "count": 42,
  "repositories": [...]
}
```

## Frontend Features

### Settings Page (`settings.html`)

#### Connection Section
- GitHub connect button
- Status indicator (connected/disconnected)
- User avatar and username display
- Disconnect button

#### Repository Selection Section
- Fetches all user repositories
- Checkbox selection for each repo
- Shows: name, description, language, stars, forks
- Public/Private badges
- Select All / Deselect All toggle
- Save Selection button

#### Connected Repositories Section
- Displays linked repositories
- Shows stats (stars, last updated)
- Unlink button (hover action)
- Refresh Repos button

#### Feedback UI
- Loading spinners while fetching
- Success notifications (auto-dismiss after 4s)
- Error messages with descriptive text
- Disabled button states

### Dashboard Page (`dashboard.html`)

#### Linked Repositories Section
- Displays all repositories linked to user's GitHub account
- Grid layout matching existing repository cards
- Shows: name, privacy, stars, last updated
- View button to open repo on GitHub
- Refresh button to sync with GitHub
- Empty state when no repos linked

## Security Considerations

### ✅ Implemented

1. **No Client-Side Token Storage**
   - GitHub access tokens NEVER stored in `localStorage`
   - Tokens stored server-side only
   - Frontend communicates via API endpoints

2. **State Validation**
   - OAuth state parameter validated to prevent CSRF
   - State expires after 10 minutes

3. **Secure Token Exchange**
   - Authorization code exchanged server-side only
   - Client secret never exposed to frontend

4. **HTTPS Recommended**
   - Use HTTPS in production
   - Set `SameSite=Strict` on cookies (if using cookies)

### 🔧 Recommendations for Production

1. **Database Integration**
   - Replace in-memory storage with proper database
   - Example PostgreSQL setup in `.env.example`
   - Encrypt tokens at rest

2. **Token Refresh**
   - Implement token refresh mechanism
   - Handle token expiration gracefully

3. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Use GitHub's rate limiting headers

4. **Audit Logging**
   - Log all OAuth activities
   - Track repository linking/unlinking

5. **CORS Configuration**
   - Restrict CORS origins in production
   - Update `frontend.main.py`:
   ```python
   allow_origins=["https://yourdomain.com"]
   ```

## Troubleshooting

### Issue: "Invalid redirect URI"
**Solution:** Ensure the `GITHUB_OAUTH_CALLBACK_URL` in `.env` exactly matches the OAuth App setting on GitHub

### Issue: "Failed to fetch repositories"
**Solution:** 
- Check GitHub token has `repo` scope
- Verify rate limits haven't been exceeded
- Check API response in browser console

### Issue: CORS errors
**Solution:**
- Verify frontend URL is in allowed origins
- Check `API_BASE_URL` in JS files
- Ensure backend CORS middleware is correctly configured

### Issue: State validation error
**Solution:**
- States expire after 10 minutes
- Don't interrupt OAuth flow for extended periods
- Check server logs for detailed error

## File Structure Summary

```
Ctrl-build-projects/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── github_model.py          (NEW)
│   │   ├── services/
│   │   │   └── github_service.py        (NEW)
│   │   ├── routes/
│   │   │   └── github.py                (NEW)
│   │   └── main.py                      (UPDATED)
│   ├── requirements.txt                 (UPDATED)
│   ├── .env.example                     (UPDATED)
│   └── run.py
├── frontend/
│   ├── pages/
│   │   ├── settings.html                (NEW)
│   │   └── dashboard.html               (UPDATED)
│   ├── js/
│   │   ├── githubAuth.js                (NEW)
│   │   ├── dashboard.js                 (NEW)
│   │   └── nav.js
│   └── css/
│       ├── main.css
│       └── github.css                   (NEW)
└── GITHUB_OAUTH_SETUP.md                (THIS FILE)
```

## Testing the Integration

### Manual Test Flow

1. **Start Backend**
   ```bash
   cd backend
   python run.py
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   python -m http.server 3000
   ```

3. **Navigate to Settings**
   - Visit `http://localhost:3000/pages/settings.html`

4. **Click "Connect with GitHub"**
   - Should redirect to GitHub OAuth screen
   - Approve permissions

5. **Return to Settings**
   - Should show user avatar and username
   - Repository selection section should appear

6. **Select Repositories**
   - Check boxes for repositories to link
   - Click "Save Selection"

7. **View Dashboard**
   - Go to Dashboard
   - Scroll to "Linked Repositories" section
   - Should see linked repos

## Next Steps & Enhancements

### Potential Improvements

1. **Webhook Integration**
   - Add GitHub webhooks for real-time updates
   - Notify on repository events (push, PR, etc.)

2. **Advanced Filtering**
   - Filter repositories by language
   - Sort by stars, date updated, etc.

3. **Repository Analytics**
   - Display contributor counts
   - Show commit activity
   - Display open issues count

4. **Automatic Syncing**
   - Periodically refresh repository data
   - Background job for updates

5. **Multi-Account Support**
   - Allow linking multiple GitHub accounts
   - Organization account integration

6. **Repository Management**
   - Create analysis for linked repos
   - Generate AI insights

## Support & Issues

For issues or questions:
1. Check the Troubleshooting section
2. Review API endpoint responses in browser console
3. Check backend logs for detailed errors
4. Verify environment variables are correctly set

## License

This integration follows the same license as the OpenIssue project.

---

**Last Updated:** April 2024
**Version:** 1.0.0
