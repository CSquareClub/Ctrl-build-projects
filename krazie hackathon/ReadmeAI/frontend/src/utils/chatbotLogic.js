export const processMessage = (message, readme) => {
  const msg = message.toLowerCase();

  let newReadme = readme;
  let reply = "✅ I updated your README.";

  // Badges enhancement
  if (msg.includes("badge")) {
    const badges = `![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-green) ![Status](https://img.shields.io/badge/status-active-brightgreen)\n\n`;
    newReadme = badges + readme;
    reply = "Added professional badges to your README.";
  }

  // Professional tone
  else if (msg.includes("professional") || msg.includes("improve")) {
    newReadme = readme
      .replace(/AI README generator/, "Advanced AI-powered system that generates professional README documentation")
      .replace(/project/, "comprehensive solution");
    reply = "Enhanced README with more professional language.";
  }

  // Installation section
  else if (msg.includes("installation") || msg.includes("install")) {
    const installation = `

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourrepo/project.git
cd project

# Install dependencies
npm install
# or
pip install -r requirements.txt

# Run the project
npm start
# or
python main.py
\`\`\`
`;
    newReadme += installation;
    reply = "Added installation instructions.";
  }

  // Usage section
  else if (msg.includes("usage") || msg.includes("how to use")) {
    const usage = `

## Usage

\`\`\`bash
# Start the application
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

### Examples
- Generate README: \`npm start\`
- Custom tone: Add --tone professional
- Export: Click Download button
`;
    newReadme += usage;
    reply = "Added usage guide and examples.";
  }

  // Features section
  else if (msg.includes("feature") || msg.includes("capabilities")) {
    const features = `

## Features

✨ **AI-Powered Generation** - Automatically generates professional README files
⚡ **Lightning Fast** - Generates content in seconds
🎯 **Customizable** - Choose tone, style, and structure
📱 **Responsive** - Works on all devices
🔒 **Secure** - No data stored, everything processed locally
💾 **Easy Export** - Download as Markdown or PDF
`;
    newReadme += features;
    reply = "Added features section.";
  }

  // API Documentation
  else if (msg.includes("api") || msg.includes("endpoint")) {
    const api = `

## API Documentation

\`\`\`
POST /api/generate
Content-Type: application/json

{
  "repo_url": "https://github.com/user/repo",
  "tone": "Professional"
}

Response:
{
  "readme": "# Project Name\\n\\n...",
  "quality_score": 94
}
\`\`\`
`;
    newReadme += api;
    reply = "Added API documentation.";
  }

  // Contributing section
  else if (msg.includes("contribut")) {
    const contributing = `

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

### Development Setup
\`\`\`bash
npm install
npm run dev
\`\`\`
`;
    newReadme += contributing;
    reply = "Added contributing guidelines.";
  }

  // License section
  else if (msg.includes("license")) {
    const license = `

## License

This project is licensed under the MIT License - see the LICENSE file for details.
`;
    newReadme += license;
    reply = "Added license section.";
  }

  // Make it longer/detailed
  else if (msg.includes("detailed") || msg.includes("more info") || msg.includes("expand")) {
    const expanded = `

## Project Structure

\`\`\`
project/
├── src/
│   ├── components/
│   ├── utils/
│   └── App.jsx
├── public/
├── tests/
└── README.md
\`\`\`

## Tech Stack

- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- AI: OpenAI API, Claude
- Database: PostgreSQL
`;
    newReadme += expanded;
    reply = "Expanded README with more details.";
  }

  // SEO/Meta
  else if (msg.includes("seo") || msg.includes("meta")) {
    const seo = `

## SEO Optimization

- **Title**: AI-Powered README Generator - Professional Documentation Made Easy
- **Keywords**: README, AI, documentation, generator, GitHub
- **Description**: Automatically generate professional README files using advanced AI technology
`;
    newReadme += seo;
    reply = "Added SEO optimization section.";
  }

  // Default response
  else if (!readme.includes(msg)) {
    reply = "💭 I can help with: badges, professional tone, installation, usage, features, API docs, contributing, license, more details, or SEO. What would you like?";
  }

  return { reply, newReadme };
};

// Mock GitHub analyzer
export const analyzeGitHub = (repoUrl) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = {
        name: repoUrl.split("/").pop(),
        owner: repoUrl.split("/").slice(-2, -1)[0],
        stars: Math.floor(Math.random() * 5000),
        description: "An innovative project built with cutting-edge technology",
        language: ["JavaScript", "Python", "TypeScript"].sort(() => 0.5 - Math.random())[0],
        topics: ["AI", "Developer Tools", "Open Source", "Automation"],
        lastUpdated: new Date().toLocaleDateString(),
      };

      resolve(mockData);
    }, 1000);
  });
};
