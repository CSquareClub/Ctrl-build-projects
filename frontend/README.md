# GitHub Profile Frontend

A modern, responsive GitHub user and repository profile viewer built with **Next.js** and **Tailwind CSS**.

## Features

✨ **Core Features:**
- Dynamic GitHub user profile display
- Repository information cards with detailed metrics
- Statistics dashboard (stars, forks, public repos)
- Recent activity feed
- Pull requests & issues tracker
- Responsive sidebar navigation
- GitHub-themed dark mode UI

🎯 **User Interface:**
- Clean, modern design matching your wireframe exactly
- Navigation bar with search functionality
- User profile header with followers/following stats
- Repository grid layout with metadata
- Activity feed component
- Pull requests & issues section

🔧 **Tech Stack:**
- **Next.js 14** - React framework for production
- **Tailwind CSS 3** - Utility-first CSS framework
- **GitHub API** - Real-time data integration
- **Axios** - HTTP client for API calls
- **PostCSS** - CSS transformation tool

## Project Structure

```
github-profile-frontend/
├── components/
│   ├── Navbar.js                 # Top navigation bar
│   ├── UserProfile.js            # User profile header
│   ├── StatsCard.js              # Statistics cards
│   ├── RepoCard.js               # Repository cards
│   ├── ActivitiesCard.js         # Activity feed
│   ├── PullRequestsCard.js       # PRs & Issues section
│   └── Sidebar.js                # Side navigation
├── pages/
│   ├── _app.js                   # Next.js app wrapper
│   └── index.js                  # Home page
├── styles/
│   └── globals.css               # Global styles
├── public/                       # Static assets
├── lib/                          # Utility functions (future)
├── package.json                  # Dependencies
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd github-profile-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. Enter any GitHub username in the search box
2. Click "Search" to load the user's profile
3. Browse:
   - User information and statistics
   - Top repositories with metadata
   - Quick access sidebar
   - Activity feed and PRs/Issues

## API Integration

The application uses the **GitHub REST API** (v3) to fetch:
- User profile data: `GET /users/{username}`
- Repository information: `GET /users/{username}/repos`
- (Future) Activity data: `GET /users/{username}/events`
- (Future) PR & Issue data: `GET /users/{username}/pulls`

### Rate Limiting

GitHub API has rate limits:
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

For production, use GitHub API authentication tokens.

## Customization

### Colors & Theme

Edit `tailwind.config.js` to modify GitHub-themed colors:

```javascript
colors: {
  github: {
    bg: '#0d1117',      // Dark background
    border: '#30363d',  // Border color
    text: '#c9d1d9',    // Text color
    muted: '#8b949e',   // Muted text
  },
}
```

### Components

Each component is modular and can be customized:
- **Navigation**: `components/Navbar.js`
- **User Info**: `components/UserProfile.js`
- **Repository Cards**: `components/RepoCard.js`
- **Stats**: `components/StatsCard.js`

## Future Enhancements

🚀 **Planned Features:**
- [ ] Authentication with GitHub OAuth
- [ ] User search with autocomplete
- [ ] Repository filtering and sorting
- [ ] Contribution graph visualization
- [ ] Gist viewer
- [ ] Organization profiles
- [ ] Trending repositories
- [ ] Dark/Light theme toggle
- [ ] Advanced search with filters
- [ ] Repository statistics page
- [ ] User comparison tool
- [ ] Following/Followers list

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy

### Deploy to Other Platforms

- **Netlify**: `npm run build`, deploy the `.next` folder
- **Docker**: Create a Dockerfile for containerization
- **Traditional Hosting**: Build and serve with Node.js

## Environment Variables

Create a `.env.local` file for sensitive data (future):

```
NEXT_PUBLIC_GITHUB_API_BASE=https://api.github.com
GITHUB_TOKEN=your_github_token_here
```

## Performance Optimization

- ✅ Image optimization via Next.js `Image` component
- ✅ Code splitting and lazy loading
- ✅ CSS minification with Tailwind
- ✅ Fast refresh during development

## Troubleshooting

### "User not found" error
- Verify the GitHub username is spelled correctly
- Check your internet connection
- Rate limit may have been exceeded (wait an hour or authenticate)

### Styling issues
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`

### API errors
- Check GitHub API status: https://www.githubstatus.com
- Verify API endpoint accessibility
- Check browser console for CORS errors

## Contributing

Feel free to fork and submit pull requests for improvements!

## License

MIT License - Feel free to use for personal and commercial projects.

## Support

For issues, questions, or suggestions, please create an issue in the repository.

---

**Built with ❤️ using Next.js & Tailwind CSS**
