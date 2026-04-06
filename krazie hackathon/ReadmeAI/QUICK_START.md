# ReadmeAI - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org))
- Python 3.8+ ([Download](https://python.org))

### Option 1: Automated Setup (Recommended)

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```bash
.\setup.bat
```

### Option 2: Manual Setup

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:3000
```

**Backend Setup (in another terminal):**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

## 📝 Usage

1. Open http://localhost:3000 in your browser
2. Paste a GitHub repository URL (e.g., `https://github.com/facebook/react`)
3. Choose a tone: **Professional**, **Beginner**, or **Fun**
4. Click **Generate README**
5. Copy or download your generated README

## 🎯 Try These Repos

```
https://github.com/facebook/react
https://github.com/vuejs/vue
https://github.com/django/django
https://github.com/kubernetes/kubernetes
```

## 🔧 Environment Setup

Create `backend/.env`:
```env
FLASK_ENV=development
FLASK_PORT=5000
GITHUB_API_TOKEN=  # Optional: Your GitHub token
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use different port
FLASK_PORT=5001 python app.py
```

### Module Not Found
```bash
# Reinstall dependencies
pip install -r requirements.txt
npm install
```

### GitHub Rate Limit
1. Get token: https://github.com/settings/tokens
2. Add to `backend/.env`:
   ```
   GITHUB_API_TOKEN=ghp_xxxx
   ```

## 📁 Project Structure

```
ReadmeAI/
├── frontend/           # React UI
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── backend/            # Flask API
│   ├── app.py
│   └── requirements.txt
│
└── README.md
```

## 🎨 Customization

### Change Colors
Edit `frontend/tailwind.config.js`:
- `navy`: #0F172A (background)
- `card`: #1E293B (cards)
- `sky`: #38BDF8 (primary)
- `purple`: #A78BFA (secondary)

### Modify README Template
Edit `backend/app.py` - `generate_readme()` function

### Change Fonts
Edit `frontend/tailwind.config.js` theme section

## 📚 API Endpoints

### POST /generate
Generate GitHub README

**Request:**
```json
{
  "repo_url": "https://github.com/user/repo",
  "tone": "Professional"
}
```

**Response:**
```json
{
  "success": true,
  "readme": "# Repo\n...",
  "repo_info": {...}
}
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy the dist/ folder
```

### Backend (Heroku/Railway)
```bash
pip freeze > requirements.txt
git push heroku main
```

## ✨ Features

✅ Dark theme with gradient UI
✅ GitHub API integration
✅ Copy to clipboard
✅ Download as .md
✅ Multiple tone options
✅ Responsive design
✅ Loading animations
✅ Error handling

## 🆘 Support

- 📖 See [README.md](README.md) for full documentation
- 📋 Check [EXAMPLES.md](EXAMPLES.md) for API examples
- 💡 Review [FILES_GUIDE.md](FILES_GUIDE.md) for file structure

## 📝 Next Steps

1. ✅ Setup complete?
2. ✅ Services running?
3. Try generating a README from https://github.com/facebook/react
4. Customize colors and fonts
5. Deploy to production

---

**Happy coding!** 🎉

Join the community and contribute: GitHub Issues & Pull Requests welcome!
