import { useState } from 'react'
import Chatbot from './components/Chatbot'
import OutputSection from './components/OutputSection'
import { Github, Sparkles, ChevronRight } from 'lucide-react'

export default function App() {
  const [readme, setReadme] = useState('')
  const [repoInput, setRepoInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const handleAnalyze = async () => {
    if (!repoInput.trim()) {
      alert('Please enter a GitHub repository URL')
      return
    }

    setLoading(true)

    // Mock analysis delay
    setTimeout(() => {
      const repoName = repoInput.split('/').pop() || 'Your Project'
      const mockReadme = `# ${repoName} 🚀

## Description
An amazing project that does incredible things! This repository contains cutting-edge technology and innovative solutions.

## Features
- ✨ Feature 1
- 🚀 Feature 2
- 💡 Feature 3

## Installation
\`\`\`bash
git clone ${repoInput}
cd ${repoName}
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License.`

      setReadme(mockReadme)
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-50 rounded-full opacity-60 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-50 rounded-full opacity-60 blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-40 backdrop-blur-sm bg-white/80 border-b border-border sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold gradient-text">
            <Sparkles size={28} className="text-accent" />
            ReadmeAI
          </div>
          <p className="text-text-secondary text-sm">Professional Documentation Generator</p>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 animate-fade-in">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-5xl font-bold text-text-primary leading-tight">
                Create Professional
                <span className="gradient-text block"> READMEs Instantly</span>
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed">
                Analyze your GitHub repository and generate comprehensive, professionally formatted README files powered by AI. Get perfect documentation in seconds.
              </p>
            </div>

            {/* Input Section */}
            <div className="card p-6 animate-slide-up space-y-4" style={{ animationDelay: '0.2s' }}>
              <label className="block text-sm font-semibold text-text-primary">GitHub Repository URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="https://github.com/username/repo"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="input-base flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="btn-primary whitespace-nowrap"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <p className="text-xs text-text-muted">Paste your GitHub URL to analyze and generate documentation</p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="card p-4">
                <div className="text-primary font-bold mb-2">✨ AI-Powered</div>
                <p className="text-sm text-text-secondary">Smart analysis and generation</p>
              </div>
              <div className="card p-4">
                <div className="text-accent font-bold mb-2">⚡ Instant</div>
                <p className="text-sm text-text-secondary">Results in seconds</p>
              </div>
            </div>
          </div>

          {/* Right Side - Animated Illustration */}
          <div className="relative h-96 animate-float" style={{ animationDelay: '0.5s' }}>
            <div className="absolute inset-0 glow-element">
              <div className="w-full h-full bg-gradient-primary rounded-2xl shadow-glow-primary flex items-center justify-center">
                <Github size={120} className="text-white opacity-80" />
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-accent rounded-full shadow-glow-accent opacity-50 blur-2xl"></div>
          </div>
        </div>
      </section>

      {/* Output Section */}
      {readme && (
        <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 animate-slide-up">
          <div className="space-y-8">
            {/* Header with Chat Button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-3xl font-bold text-text-primary">Your Generated README</h2>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="btn-accent flex items-center gap-2 whitespace-nowrap"
              >
                <Sparkles size={20} />
                {chatOpen ? 'Close' : 'Enhance with AI'}
                <ChevronRight size={18} className={`transition-transform ${chatOpen ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* README Output */}
            <OutputSection readme={readme} />
          </div>
        </section>
      )}

      {/* Chatbot Panel */}
      <Chatbot readme={readme} setReadme={setReadme} isOpen={chatOpen} setIsOpen={setChatOpen} />
    </div>
  )
}
