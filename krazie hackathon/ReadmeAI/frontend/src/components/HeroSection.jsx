import { useState } from 'react'

export default function HeroSection({ onGenerate, tone, setTone, disabled }) {
  const [repoUrl, setRepoUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (repoUrl.trim()) {
      onGenerate(repoUrl)
      setRepoUrl('')
    }
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center space-y-10 animate-fade-in">
        {/* Title */}
        <div>
          <h2 className="text-5xl md:text-6xl font-extrabold font-poppins mb-6 gradient-text drop-shadow-xl">
            Generate Professional
            <br />
            <span className="text-white">README Files in Seconds</span>
          </h2>
          <p className="text-xl text-slate-300 mt-4">
            AI-powered documentation for developers
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card-base p-10 space-y-8 shadow-glow-blue">
          {/* GitHub URL Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              GitHub Repository URL
            </label>
            <input
              type="text"
              placeholder="e.g., https://github.com/username/repo-name"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="input-base text-lg"
              disabled={disabled}
            />
            <p className="text-xs text-slate-400 mt-2">
              Enter your GitHub repository URL to generate a professional README
            </p>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              README Tone
            </label>
            <div className="flex gap-3 justify-center">
              {['Professional', 'Beginner', 'Fun'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  disabled={disabled}
                  className={`tab-btn ${tone === t ? 'tab-btn-active scale-105' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={disabled || !repoUrl.trim()}
            className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? 'Generating...' : 'Generate README'}
          </button>
        </form>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {[
            { icon: '⚡', title: 'Lightning Fast', desc: 'Get your README in seconds' },
            { icon: '🎯', title: 'High Quality Output', desc: 'Best practices built-in' },
            { icon: '🧠', title: 'AI Powered', desc: 'Advanced AI for docs' },
            { icon: '🎨', title: 'Custom Tone', desc: 'Choose your style' },
          ].map((item) => (
            <div key={item.title} className="card-base p-8 text-center border border-sky/20 hover:border-sky/40 hover:shadow-glow-blue transition-all duration-300 hover:-translate-y-2 hover:scale-105 group">
              <div className="text-4xl mb-3 drop-shadow-lg group-hover:animate-pulse">{item.icon}</div>
              <h3 className="font-semibold text-xl mb-2 gradient-text">{item.title}</h3>
              <p className="text-slate-400 text-base">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
