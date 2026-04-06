# Example Usage

This guide shows how to use the ReadmeAI API directly.

## Example 1: Using the Web Interface

1. Open http://localhost:3000
2. Enter a GitHub repository URL: `https://github.com/facebook/react`
3. Select tone: "Professional"
4. Click "Generate README"
5. Wait for the README to be generated
6. Copy or download the generated README

## Example 2: Using cURL (Direct API Call)

```bash
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/facebook/react",
    "tone": "Professional"
  }'
```

## Example 3: Using Python

```python
import requests
import json

url = "http://localhost:5000/generate"
payload = {
    "repo_url": "https://github.com/facebook/react",
    "tone": "Professional"
}

response = requests.post(url, json=payload)
data = response.json()

if data.get('success'):
    print(data['readme'])
else:
    print(f"Error: {data['error']}")
```

## Example 4: Using JavaScript/Node.js

```javascript
const generateReadme = async (repoUrl, tone = 'Professional') => {
  try {
    const response = await fetch('http://localhost:5000/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo_url: repoUrl,
        tone: tone,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(data.readme);
      return data.readme;
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

// Usage
generateReadme('https://github.com/facebook/react');
```

## Example Repositories to Test

Try these repositories to see how ReadmeAI generates READMEs:

### JavaScript Projects
- `https://github.com/facebook/react` - React UI library
- `https://github.com/vuejs/vue` - Vue.js framework
- `https://github.com/torvalds/linux` - Linux kernel

### Python Projects
- `https://github.com/django/django` - Django web framework
- `https://github.com/psf/requests` - HTTP library
- `https://github.com/pallets/flask` - Flask web framework

### Multi-language Projects
- `https://github.com/microsoft/vscode` - Visual Studio Code
- `https://github.com/kubernetes/kubernetes` - Kubernetes
- `https://github.com/docker/docker` - Docker

## Response Examples

### Success Response
```json
{
  "success": true,
  "readme": "# React\n\nA JavaScript library for building user interfaces...",
  "repo_info": {
    "name": "react",
    "description": "A JavaScript library for building user interfaces",
    "language": "JavaScript",
    "stars": 195000,
    "url": "https://github.com/facebook/react",
    "owner": "facebook"
  }
}
```

### Error Response
```json
{
  "error": "Repository not found"
}
```

## Tone Variations

### Professional Tone
Used for enterprise and production projects. Includes:
- Formal language
- Emphasis on stability and performance
- Comprehensive documentation
- Best practices

### Beginner Tone
Used for learning resources and tutorials. Includes:
- Friendly language
- Encouraging tone
- Step-by-step guides
- Emojis and visual markers

### Fun Tone
Used for hobby and creative projects. Includes:
- Casual language
- Playful tone
- Creative formatting
- More emojis

## Common Issues

### Issue: "Invalid repository URL"
**Solution:** Use format: `https://github.com/owner/repo-name` (with .git or without)

### Issue: "Repository not found"
**Solution:** Check if repository is public and URL is correct

### Issue: "API rate limit exceeded"
**Solution:** Add GitHub token to `.env` file for higher limits

## Tips for Best Results

1. **Use public repositories** - Private repos may not be accessible
2. **Verify the URL** - Double-check for typos
3. **Update GitHub token** - Adds 5000 requests/hour vs 60
4. **Different tones** - Try multiple tones to find best fit
5. **Edit generated content** - Customize the generated README further

---

For more information, see [README.md](../README.md)
