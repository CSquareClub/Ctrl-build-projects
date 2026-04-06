import { useState } from 'react'
import Chatbot from './components/Chatbot'
import OutputSection from './components/OutputSection'

export default function App() {
  const [readme, setReadme] = useState('')
  const [repoInput, setRepoInput] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-navy text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple opacity-20 rounded-full blur-3xl"></div>
      </div>

      <main className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-700/20 sticky top-0 z-50 bg-glass/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold gradient-text">ReadmeAI 🚀</h1>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 py-20">
          <h2 className="text-5xl font-bold gradient-text mb-6">Generate Professional README Files</h2>
          <p className="text-xl text-slate-300 mb-10">AI-powered documentation for developers</p>

          {/* Input Section */}
          <div className="card-base p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Enter GitHub repository URL (e.g., https://github.com/user/repo)"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-white placeholder-slate-400"
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Analyze Repository'}
              </button>
            </div>
          </div>

          {/* Output Section */}
          {readme && <OutputSection readme={readme} />}
        </section>
      </main>

      {/* Chatbot */}
      <Chatbot readme={readme} setReadme={setReadme} />
    </div>
  )
}
