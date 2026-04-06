import { useEffect, useState } from 'react'

export default function MarkdownPreview({ content }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    const parseMarkdown = (md) => {
      let result = md
        // Headers
        .replace(/^### (.*?)$/gm, '<h3 class="text-xl font-bold mt-6 mb-3 gradient-text">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 gradient-text">$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1 class="text-4xl font-bold mt-8 mb-4 gradient-text">$1</h1>')
        // Bold and Italic
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-sky">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/^```[\w]*\n|```$/g, '')
          return `<pre class="bg-navy/80 rounded-xl p-4 overflow-x-auto my-4 border border-sky/20 shadow-inner"><code class="text-slate-200 font-mono text-sm">${escapeHtml(code)}</code></pre>`
        })
        // Inline code
        .replace(/`(.*?)`/g, '<code class="bg-navy/80 px-2 py-1 rounded text-sky font-mono text-sm">$1</code>')
        // Lists
        .replace(/^\* (.*?)$/gm, '<li class="ml-6 text-slate-300">$1</li>')
        .replace(/(<li.*?<\/li>)/s, '<ul class="list-disc space-y-2 my-3">$1</ul>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p class="mb-4 text-slate-300">')
        .replace(/^(?!<[h1-3]|<pre|<ul|<li)/gm, '<p class="mb-4 text-slate-300">')
        .replace(/\n(?!#|<|$)/gm, '<br/>')

      return result
        .split('\n')
        .map((line) => (line.match(/<[hp]>|<[hu][l1-3]|<pre/) ? line : line ? `<p class="mb-4 text-slate-300">${line}</p>` : ''))
        .join('')
    }

    const escapeHtml = (text) => {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    setHtml(parseMarkdown(content))
  }, [content])

  return (
    <div className="p-8">
      <div 
        className="prose prose-invert max-w-none font-inter"
        style={{
          '--tw-prose-body': '#e2e8f0',
          '--tw-prose-headings': '#f1f5f9',
          '--tw-prose-links': '#38BDF8',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
