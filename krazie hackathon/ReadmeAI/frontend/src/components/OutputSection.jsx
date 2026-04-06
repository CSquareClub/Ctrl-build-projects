import { useState, useEffect } from 'react'
import MarkdownPreview from './MarkdownPreview'

export default function OutputSection({ readme }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(readme)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([readme], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = 'README.md'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-extrabold font-poppins gradient-text drop-shadow-lg">Your Generated README</h2>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`btn-primary flex items-center gap-2 px-6 py-2 ${copied ? 'scale-105 shadow-glow-blue' : ''}`}
            title="Copy to clipboard"
          >
            {copied ? <span>✓ Copied!</span> : <span>📋 Copy</span>}
          </button>
          <button
            onClick={handleDownload}
            className="btn-secondary flex items-center gap-2 px-6 py-2"
            title="Download as README.md"
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      {/* Preview Card */}
      <div className="card-base overflow-hidden shadow-glow-purple p-0 md:p-2">
        <MarkdownPreview content={readme} />
      </div>
    </div>
  )
}
