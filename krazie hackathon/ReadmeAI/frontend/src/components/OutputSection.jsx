import { useState } from 'react'
import MarkdownPreview from './MarkdownPreview'
import { Copy, Download, Check } from 'lucide-react'

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
    <div className="space-y-6 animate-fade-in">
      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={handleCopy}
          className={`btn-primary flex items-center gap-2 px-6 py-3 transition-all ${
            copied ? 'ring-2 ring-success/50 bg-success/10' : ''
          }`}
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={18} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={18} />
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>
        <button
          onClick={handleDownload}
          className="btn-secondary flex items-center gap-2 px-6 py-3"
          title="Download as README.md"
        >
          <Download size={18} />
          <span>Download Markdown</span>
        </button>
      </div>

      {/* Preview Card */}
      <div className="card overflow-hidden">
        <MarkdownPreview content={readme} />
      </div>
    </div>
  )
}
