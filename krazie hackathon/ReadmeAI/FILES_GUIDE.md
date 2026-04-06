# ReadmeAI Project Files Guide

## Project Organization

```
ReadmeAI/
├── frontend/                    # React Application
│   ├── src/
│   │   ├── components/         # React Components
│   │   │   ├── HeroSection.jsx      # Main input form
│   │   │   ├── OutputSection.jsx    # README display
│   │   │   ├── MarkdownPreview.jsx  # Markdown parser
│   │   │   └── LoadingSpinner.jsx   # Loading state
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Global styles
│   ├── index.html              # HTML template
│   ├── package.json            # Dependencies
│   ├── tailwind.config.js      # Tailwind config
│   ├── postcss.config.js       # PostCSS config
│   └── vite.config.js          # Vite config
│
├── backend/                     # Flask API
│   ├── app.py                  # Main Flask app
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment template
│
└── README.md                   # This file
```

## Quick Start

### Start Frontend
```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:3000
```

### Start Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

## Key Features

✅ Dark theme with gradient UI
✅ Copy to clipboard
✅ Download as .md file
✅ Multiple tone options
✅ Real GitHub API integration
✅ Responsive design
✅ Loading animations
✅ Error handling

## Component Overview

### Frontend Components

**HeroSection.jsx**
- Input field for GitHub repo URL
- Tone selector buttons
- Generate button
- Info cards

**OutputSection.jsx**
- Markdown preview
- Copy button
- Download button
- Formatted README display

**MarkdownPreview.jsx**
- Parses markdown to HTML
- Syntax highlighting
- Code block styling
- Headers and lists formatting

**LoadingSpinner.jsx**
- Animated spinner
- Loading message
- Loading progress text

### Backend Routes

**POST /generate**
- Accepts GitHub URL and tone
- Fetches repo info from GitHub API
- Generates customized README
- Returns formatted markdown

**GET /health**
- Health check endpoint
- Returns service status

## Usage Flow

1. User enters GitHub repo URL (e.g., https://github.com/facebook/react)
2. Selects README tone (Professional/Beginner/Fun)
3. Clicks "Generate README"
4. Frontend sends request to backend API
5. Backend fetches repo data from GitHub API
6. Backend generates customized README in markdown
7. Frontend displays formatted README
8. User can copy or download the README

## Customization Options

### Change Colors
Edit `tailwind.config.js`:
- `navy`: Background color
- `card`: Card background
- `sky`: Primary accent
- `purple`: Secondary accent

### Change Fonts
Edit `tailwind.config.js` font families:
- `inter`: UI font
- `poppins`: Headings
- `mono`: Code font

### Modify README Template
Edit `generate_readme()` in `app.py` to customize:
- Sections included
- Content tone
- Formatting style
- Emoji usage

## API Integration

### Frontend makes request:
```javascript
fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repo_url: 'https://github.com/user/repo',
    tone: 'Professional'
  })
})
```

### Backend processes:
1. Parses GitHub URL
2. Validates repository exists
3. Fetches repo metadata
4. Generates README with tone
5. Returns JSON response

## Environment Setup

### Frontend Environment
- Node.js 16+
- npm or yarn
- Modern browser

### Backend Environment
- Python 3.8+
- pip/venv
- GitHub API access (optional token)

## Deployment Considerations

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy the dist/ folder
```

### Backend (Heroku/Railway)
```bash
pip freeze > requirements.txt
# Deploy with Procfile: web: gunicorn app:app
```

## Error Handling

**Invalid URL:**
- Frontend validates format
- Backend returns clear error message

**Repository Not Found:**
- GitHub API returns 404
- User sees friendly error message

**Rate Limiting:**
- Add GitHub token to .env
- Increases rate limit to 5000 requests/hour

## Performance Tips

- Use production builds
- Enable gzip compression
- Cache GitHub API responses
- Lazy load components
- Optimize bundle size

## Testing

```bash
# Frontend tests would go in src/__tests__
# Backend tests in tests/

# Add to package.json:
"test": "vitest"

# Add to test files
```

---

**Created for:** ReadmeAI - Smart README Generator  
**Version:** 1.0.0  
**Last Updated:** 2026
