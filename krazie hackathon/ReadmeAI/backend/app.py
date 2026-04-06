from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

GITHUB_API_TOKEN = os.getenv('GITHUB_API_TOKEN', '')

def parse_repo_url(url):
    """Extract owner and repo name from GitHub URL."""
    patterns = [
        r'github\.com/([^/]+)/([^/.]+)',  # https://github.com/owner/repo
        r'github\.com/([^/]+)/([^/]+)\.git',  # https://github.com/owner/repo.git
        r'^([^/]+)/([^/]+)$',  # owner/repo format
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1), match.group(2)
    
    return None, None

def fetch_repo_info(owner, repo):
    """Fetch repository information from GitHub API."""
    headers = {}
    if GITHUB_API_TOKEN:
        headers['Authorization'] = f'token {GITHUB_API_TOKEN}'
    
    url = f'https://api.github.com/repos/{owner}/{repo}'
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 404:
            return None, "Repository not found"
        elif response.status_code == 403:
            return None, "API rate limit exceeded or access denied"
        elif response.status_code != 200:
            return None, f"GitHub API error: {response.status_code}"
        
        data = response.json()
        
        return {
            'name': data.get('name', 'Unknown'),
            'description': data.get('description', 'No description provided'),
            'language': data.get('language', 'Unknown'),
            'url': data.get('html_url', ''),
            'owner': data.get('owner', {}).get('login', owner),
            'stars': data.get('stargazers_count', 0),
        }, None
    
    except requests.exceptions.RequestException as e:
        return None, f"Network error: {str(e)}"

def generate_readme(repo_info, tone='Professional'):
    """Generate README markdown from repository information."""
    
    name = repo_info.get('name', 'Project')
    description = repo_info.get('description', 'A great project')
    language = repo_info.get('language', 'JavaScript')
    url = repo_info.get('url', '')
    owner = repo_info.get('owner', 'creator')
    
    # Adjust tone in descriptions
    professional_phrases = {
        'Professional': {
            'intro': 'A robust and professional solution for',
            'features': 'Key Features',
            'usage': 'Getting Started',
            'install': 'Installation',
        },
        'Beginner': {
            'intro': 'A fun and easy project that helps with',
            'features': '✨ What This Project Does',
            'usage': '🚀 How to Use',
            'install': '📦 Setup Guide',
        },
        'Fun': {
            'intro': 'An awesome thing that does',
            'features': '🎉 Amazing Features',
            'usage': '🎮 Time to Play',
            'install': '⚡ Quick Start',
        },
    }
    
    phrases = professional_phrases.get(tone, professional_phrases['Professional'])
    
    readme = f"""# {name}

![GitHub stars](https://img.shields.io/github/stars/{owner}/{name}?style=social)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Language](https://img.shields.io/badge/language-{language}-green.svg)

{description}

## {phrases['features']}

- ⚡ **Fast & Efficient** - Optimized for performance
- 🎯 **Easy to Use** - Simple and intuitive interface
- 🔧 **Fully Customizable** - Configure to your needs
- 📚 **Well Documented** - Clear and helpful docs
- 🚀 **Production Ready** - Battle-tested codebase

## {phrases['install']}

### Prerequisites
- {language}
- npm or yarn package manager
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone {url}
   cd {name}
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run the project**
   ```bash
   npm start
   # or
   yarn start
   ```

## {phrases['usage']}

### Basic Usage

```python
# Import and use the project
import {name}

# Initialize
app = {name}.init()

# Use the functionality
result = app.run()
print(result)
```

### Examples

See the [examples](./examples) directory for more detailed usage patterns.

### Configuration

Key configuration options:

- `DEBUG` - Enable debug mode
- `LOG_LEVEL` - Set logging level (debug, info, warn, error)
- `PORT` - Server port (default: 3000)

## Project Structure

```
{name}/
├── src/
│   ├── components/
│   ├── utils/
│   └── main.js
├── tests/
├── docs/
└── README.md
```

## Technologies Used

- **Language**: {language}
- **Framework**: Express.js / React / Next.js
- **Database**: MongoDB / PostgreSQL
- **Testing**: Jest / Mocha
- **Deployment**: Docker / Kubernetes

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting & Formatting

```bash
npm run lint
npm run format
```

## Contributing

We love contributions! Here's how to get started:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazingreature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use ESLint for code quality
- Write meaningful commit messages
- Add tests for new features

## Troubleshooting

### Common Issues

**Issue**: Module not found
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Port already in use
```bash
# Solution: Change the PORT environment variable
PORT=3001 npm start
```

## Performance Tips

- Use caching for frequently accessed data
- Optimize database queries
- Enable gzip compression
- Use a CDN for static assets

## Roadmap

- [ ] Add feature X
- [ ] Improve performance
- [ ] Expand documentation
- [ ] Add plugin system
- [ ] Support for more platforms

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

Need help? 

- 📧 Email: {owner}@example.com
- 💬 [Discussions](https://github.com/{owner}/{name}/discussions)
- 🐛 [Report Issues](https://github.com/{owner}/{name}/issues)
- 📖 [Read the Docs](./docs/README.md)

## Acknowledgments

- Thanks to all [contributors](CONTRIBUTORS.md)
- Inspired by amazing open-source projects
- Special thanks to the community

---

⭐ If you find this project helpful, please consider giving it a star!

Made with ❤️ by [{owner}](https://github.com/{owner})
"""
    
    return readme

@app.route('/generate', methods=['POST'])
def generate():
    """Generate README from GitHub repository."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        repo_url = data.get('repo_url', '').strip()
        tone = data.get('tone', 'Professional')
        
        # Validate input
        if not repo_url:
            return jsonify({'error': 'Repository URL is required'}), 400
        
        if tone not in ['Professional', 'Beginner', 'Fun']:
            tone = 'Professional'
        
        # Parse repository URL
        owner, repo = parse_repo_url(repo_url)
        
        if not owner or not repo:
            return jsonify({
                'error': 'Invalid repository URL. Use format: https://github.com/owner/repo'
            }), 400
        
        # Fetch repository information
        repo_info, error = fetch_repo_info(owner, repo)
        
        if error:
            return jsonify({'error': error}), 400
        
        # Generate README
        readme = generate_readme(repo_info, tone)
        
        return jsonify({
            'success': True,
            'readme': readme,
            'repo_info': repo_info
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'ReadmeAI Backend'
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=debug
    )
