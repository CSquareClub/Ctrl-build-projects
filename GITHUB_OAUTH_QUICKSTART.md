# GitHub OAuth Integration - Quick Start

## 30-Second Setup

### 1. Create GitHub OAuth App
- Go to: https://github.com/settings/developers/oauth-apps
- Create app with callback: `http://localhost:8000/auth/github/callback`
- Copy Client ID and Secret

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your GitHub credentials
pip install -r requirements.txt
python run.py
# Server runs on http://localhost:8000
```

### 3. Configure Frontend
```bash
cd frontend
# Edit js/githubAuth.js line 9 if needed:
# const API_BASE_URL = 'http://localhost:8000';
python -m http.server 3000
# Visit http://localhost:3000/pages/settings.html
```

## What You Get

### Settings Page (`/pages/settings.html`)
- ✅ GitHub login button
- ✅ Repository browser with checkboxes
- ✅ Link/unlink repositories
- ✅ User profile display
- ✅ Responsive design

### Dashboard Page (`/pages/dashboard.html`)
- ✅ "Linked Repositories" section
- ✅ Displays all linked repos
- ✅ Refresh button
- ✅ Links to GitHub repos
- ✅ Star count and last updated

### Security
- ✅ Tokens never stored locally
- ✅ Server-side token management
- ✅ CSRF protection via state validation
- ✅ HTTPS-ready

## Files Changed/Created

**Backend (Python/FastAPI):**
- ✅ `models/github_model.py` - Data models
- ✅ `services/github_service.py` - OAuth logic
- ✅ `routes/github.py` - API endpoints
- ✅ `app/main.py` - Route registration
- ✅ `requirements.txt` - Dependencies
- ✅ `.env.example` - Configuration template

**Frontend (HTML/CSS/JS):**
- ✅ `pages/settings.html` - Settings UI
- ✅ `js/githubAuth.js` - OAuth + repo logic (300 lines)
- ✅ `js/dashboard.js` - Dashboard display (150 lines)
- ✅ `css/github.css` - Styling (500+ lines)
- ✅ `pages/dashboard.html` - New section added

## Architecture

```
GitHub OAuth Flow:
1. User clicks "Connect with GitHub"
2. Redirected to GitHub.com
3. User approves permissions
4. GitHub redirects back with authorization code
5. Backend exchanges code for access token
6. Backend stores token securely
7. Frontend fetches repositories via API
8. User selects repos to link
9. Repos saved to backend storage
10. Dashboard displays linked repos
```

## API Endpoints

```
GET  /auth/github/auth/github              - Start OAuth
POST /auth/github/auth/github/callback     - OAuth callback
GET  /auth/github/repos                    - Fetch repos
POST /auth/github/save-repos               - Save selection
GET  /auth/github/linked-repos             - Get linked repos
DELETE /auth/github/linked-repos/{id}      - Unlink repo
POST /auth/github/refresh-repos            - Refresh list
```

## Frontend Usage

Settings page flows:
```javascript
// Triggered by clicking "Connect with GitHub"
gitHubOAuth.startOAuth()

// After GitHub redirects back
gitHubOAuth.onOAuthSuccess()

// Fetch available repos
gitHubOAuth.fetchRepositories()

// Save selected repos
gitHubOAuth.saveSelectedRepos()

// Display on dashboard
dashboardLinkedRepos.loadLinkedRepositories()
```

## Testing

```bash
# Terminal 1 - Backend
cd backend && python run.py

# Terminal 2 - Frontend
cd frontend && python -m http.server 3000

# Browser
# Visit http://localhost:3000/pages/settings.html
# Click "Connect with GitHub"
# Select repos and save
# View on dashboard: http://localhost:3000/pages/dashboard.html
```

## Deployment Checklist

- [ ] Create GitHub OAuth App with production URLs
- [ ] Update `.env` with production credentials
- [ ] Set up database (replace in-memory storage)
- [ ] Enable HTTPS
- [ ] Update CORS allowed origins
- [ ] Configure rate limiting
- [ ] Set up logging
- [ ] Test full OAuth flow in production
- [ ] Add monitoring/alerts

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Ensure `.env` `GITHUB_OAUTH_CALLBACK_URL` matches GitHub app setting |
| CORS error | Check `API_BASE_URL` in JS files matches actual backend |
| Token not working | Verify GitHub app has `repo` scope |
| Repos not loading | Check browser console, verify token validity |
| State validation error | OAuth state expires after 10 mins, don't pause flow |

## Next Steps

1. Customize styling to match your brand
2. Add database integration (PostgreSQL recommended)
3. Implement webhook handlers for real-time updates
4. Add analytics/insights for linked repos
5. Create admin dashboard for monitoring

## Support

See `GITHUB_OAUTH_SETUP.md` for detailed documentation.

---

**Ready to use!** 🚀
