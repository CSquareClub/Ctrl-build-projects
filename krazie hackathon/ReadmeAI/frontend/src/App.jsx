import { useState } from 'react'
import HeroSection from './components/HeroSection'
import OutputSection from './components/OutputSection'
import LoadingSpinner from './components/LoadingSpinner'

export default function App() {
  const [readme, setReadme] = useState('')
  const [loading, setLoading] = useState(false)
  const [tone, setTone] = useState('Professional')

  const handleGenerate = async (repoUrl) => {
    setLoading(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          tone: tone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate README')
      }

      const data = await response.json()
      setReadme(data.readme)
    } catch (error) {
      console.error('Error:', error)
      alert('Error generating README. Please check the URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy font-inter">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[420px] h-[420px] bg-sky opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-purple opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-pink opacity-10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <main className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-700/20 backdrop-blur-sm sticky top-0 z-50 bg-glass/80 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold gradient-text drop-shadow-lg">ReadmeAI 🚀</h1>
              <div className="text-xs text-slate-400">Smart README Generator</div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <HeroSection 
          onGenerate={handleGenerate}
          tone={tone}
          setTone={setTone}
          disabled={loading}
        />

        {/* Output or Loading State */}
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <LoadingSpinner />
          </div>
        ) : readme && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <OutputSection readme={readme} />
          </div>
        )}
      </main>
    </div>
  )
}
