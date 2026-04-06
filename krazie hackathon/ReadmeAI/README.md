# ReadmeAI - Smart README Generator

A modern web application that generates professional README files automatically from GitHub repositories using AI.

## Project Structure

```
ReadmeAI/
├── frontend/          # React + Tailwind CSS UI
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── backend/           # Flask API Server
    ├── app.py
    ├── requirements.txt
    └── .env.example
```

## Features

✨ **Modern UI** - Dark theme with gradient accents  
⚡ **Fast Generation** - AI-powered README creation  
🎯 **Customizable** - Multiple tone options (Professional, Beginner, Fun)  
📱 **Responsive** - Works on all devices  
📋 **Easy Sharing** - Copy and download functionality  
🔒 **Secure** - Built with security best practices  

## Tech Stack

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Utility-first styling
- **Vite** - Ultra-fast build tool
- **Axios** - HTTP client

### Backend
- **Flask** - Lightweight web framework
- **GitHub API** - Repository data fetching
- **Python 3.8+** - Backend language

## Setup & Installation

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build
```

### Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GitHub token (optional)

# Run development server (runs on http://localhost:5000)
python app.py
```

## API Endpoints

### `POST /generate`

Generate a README from a GitHub repository.

**Request:**
```json
{
  "repo_url": "https://github.com/username/repo-name",
  "tone": "Professional"
}
```

**Response:**
```json
{
  "success": true,
  "readme": "# Repo Name\n...",
  "repo_info": {
    "name": "repo-name",
    "description": "...",
    "language": "JavaScript",
    "stars": 100,
    "url": "https://github.com/username/repo-name"
  }
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "ReadmeAI Backend"
}
```

## Usage

1. **Enter GitHub URL** - Paste your repository URL
2. **Select Tone** - Choose Professional, Beginner, or Fun
3. **Generate** - Click the generate button
4. **Copy/Download** - Copy to clipboard or download as .md file

## Environment Variables

### Backend (.env)
```
FLASK_ENV=development          # or production
FLASK_PORT=5000                # API server port
GITHUB_API_TOKEN=              # Optional GitHub token for higher rate limits
```

## Development

### Run Both Services Simultaneously

**Terminal 1 (Frontend):**
```bash
cd frontend
npm run dev
```

**Terminal 2 (Backend):**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then visit `http://localhost:3000`

## Features in Detail

### Tone Options

- **Professional** - Best for tech companies and serious projects
- **Beginner** - Friendly and encouraging for learning resources
- **Fun** - Casual and playful for hobby projects

### Generated README Includes

- Project title and badges
- Description
- Key features with emojis
- Installation instructions
- Usage examples
- Project structure
- Technologies used
- Development setup
- Contributing guidelines
- License information
- Support links

## Customization

### Styling

Edit [src/index.css](frontend/src/index.css) for custom styles.

Tailwind configuration: [tailwind.config.js](frontend/tailwind.config.js)

### README Templates

Modify the `generate_readme()` function in [backend/app.py](backend/app.py) to customize generated content.

### Colors

- Primary: Sky Blue (#38BDF8)
- Secondary: Purple (#A78BFA)
- Background: Navy (#0F172A)
- Cards: Slate (#1E293B)

## Troubleshooting

### Port Already in Use

```bash
# Change port in .env
FLASK_PORT=5001
```

### GitHub API Rate Limit

Get a personal access token from [GitHub Settings](https://github.com/settings/tokens) and add to .env:

```
GITHUB_API_TOKEN=your_token_here
```

### CORS Errors

Ensure backend is running on `http://localhost:5000` and frontend on `http://localhost:3000`.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

- Use production builds for testing
- Enable caching headers on backend
- Optimize images and assets
- Use minified CSS/JS bundles

## Future Enhancements

- [ ] AI-powered content generation
- [ ] Multiple language support
- [ ] Custom templates
- [ ] README versioning
- [ ] Team collaboration
- [ ] Export to multiple formats
- [ ] GitHub integration for direct commits
- [ ] Analytics dashboard

## License

MIT License - See LICENSE file for details

## Support

- 📧 Email: support@readmeai.com
- 💬 Issues: GitHub Issues
- 📖 Docs: This README

## Contributing

Contributions are welcome! 

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request

---

Made with ❤️ for the open-source community

⭐ If you find this useful, please give it a star!
