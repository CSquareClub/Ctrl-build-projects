# Project Setup and Build Instructions

## Quick Start - Development

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn
- Git

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   # Copy and edit if needed
   cp .env.example .env
   ```

3. **Run the backend:**
   ```bash
   python run.py
   ```
   Backend will be available at: `http://localhost:5000`

### Frontend Setup

1. **Install Node dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```
   Frontend will be available at: `http://localhost:3000`

3. **Build for production:**
   ```bash
   npm run build
   ```

## Docker Deployment

### Build and Run with Docker Compose

1. **Build images:**
   ```bash
   docker-compose build
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Check status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop services:**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Health Check
- `GET /api/health` - Service health status

### Analysis
- `POST /api/analyze` - Analyze a single issue
- `POST /api/analyze/batch` - Analyze multiple issues
- `POST /api/analyze/priority` - Get priority classification
- `POST /api/analyze/embedding` - Get text embedding

### Issues Management
- `GET /api/issues` - Get all issues
- `GET /api/issues/<id>` - Get a specific issue
- `POST /api/issues` - Create new issue
- `PUT /api/issues/<id>` - Update issue
- `DELETE /api/issues/<id>` - Delete issue
- `GET /api/issues/priority/<priority>` - Filter by priority

### Similar Issues
- `POST /api/similar` - Find similar issues
- `GET /api/similar/<id>` - Get similar to issue ID
- `POST /api/similar/batch` - Find similar for multiple queries
- `GET /api/similar/index-info` - Get vector index info

## Testing

### Run Backend Tests
```bash
cd backend
pytest tests/
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

## Troubleshooting

### Port Already in Use
```bash
# Ubuntu/Linux/Mac
lsof -i :5000  # Check backend port
lsof -i :3000  # Check frontend port

# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :3000
```

### Python Dependencies Issue
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Node Dependencies Issue
```bash
rm -rf node_modules package-lock.json
npm install
```

## Architecture Overview

```
Frontend (React + Vite)
├── Port: 3000
├── Services: API client, Helpers, Components
└── Pages: Home (form), Settings

Backend (Flask)
├── Port: 5000
├── Routes: Analyze, Issues, Similar
├── Services: Embedding, Classifier, Priority, Vector
└── Data: FAISS index, Issues JSON

Docker
├── Frontend Container: Node-based
├── Backend Container: Python-based
└── Network: Custom bridge network
```

## Environment Variables

### Backend (.env)
- `FLASK_ENV` - Development/Production
- `FLASK_DEBUG` - Enable debug mode
- `FLASK_HOST` - Host address (default: 0.0.0.0)
- `FLASK_PORT` - Port number (default: 5000)
- `SECRET_KEY` - Flask secret key
- `CORS_ORIGINS` - Allowed CORS origins
- `EMBEDDING_MODEL` - Sentence transformer model
- `TOP_K_SIMILAR` - Number of similar issues to return
- `SIMILARITY_THRESHOLD` - Minimum similarity score

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_APP_NAME` - Application name
- `REACT_APP_ENV` - Environment (development/production)

## Performance Tuning

### Backend
- Use production WSGI server (Gunicorn, uWSGI) instead of Flask dev server
- Enable caching for embeddings
- Optimize FAISS index parameters
- Use connection pooling for databases

### Frontend
- Enable gzip compression
- Use CDN for static assets
- Optimize bundle size with tree-shaking
- Enable service workers for PWA features

## Security Considerations

1. **Backend:**
   - Update `SECRET_KEY` in production
   - Enable HTTPS only
   - Validate all inputs
   - Implement rate limiting
   - Use environment variables for secrets

2. **Frontend:**
   - Sanitize user input
   - Implement CSRF protection
   - Use Content Security Policy headers
   - Keep dependencies updated

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Review error messages
3. Check API endpoints with curl/Postman
4. Verify environment variables

