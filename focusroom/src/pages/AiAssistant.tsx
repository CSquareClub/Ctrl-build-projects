import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles } from 'lucide-react'

import { Sidebar } from '../components/Sidebar'
import { type ChatMessage, sendGeminiMessage } from '../services/gemini'

type AssistantQuickPrompt = {
  title: string
  prompt: string
}

const quickPrompts: AssistantQuickPrompt[] = [
  {
    title: 'Study plan',
    prompt: 'Create a 1-week study plan for a medical student preparing for an exam with 2 hours per day.',
  },
  {
    title: 'Flashcard help',
    prompt: 'Turn the topic of blood pressure regulation into 5 flashcards with question and answer format.',
  },
  {
    title: 'Focus reset',
    prompt: 'Give me a 3-minute focus reset routine when I feel distracted.',
  },
]

const starterMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'I am your AI study assistant. Ask me for study plans, explanations, flashcards, or focus strategies.',
  },
]

export function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  const submitPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt || sending) {
      return
    }

    setError('')
    setSending(true)
    setInput('')

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmedPrompt }]
    setMessages(nextMessages)

    try {
      const reply = await sendGeminiMessage(nextMessages)
      setMessages((current) => [...current, { role: 'assistant', content: reply }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reach Gemini.')
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not generate a reply right now. Please check your Gemini key, network, or API access and try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="ml-72 p-6">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Ai Assistant</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">Chat with Gemini for study answers, planning, and focus support.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Study Chat</p>
                <p className="text-xs text-[var(--muted)]">Powered by Gemini</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-xs text-[var(--muted)]">
                <Sparkles className="h-3.5 w-3.5" />
                Live Chat
              </span>
            </div>

            <div className="mt-4 h-[520px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={[
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6',
                      message.role === 'user'
                        ? 'ml-auto border border-[var(--border)] bg-[var(--card)] text-[var(--text)]'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]',
                    ].join(' ')}
                  >
                    {message.content}
                  </div>
                ))}
                {sending ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gemini is thinking...
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-[var(--muted)]">{error}</p> : null}

            <form
              className="mt-4 flex gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                void submitPrompt(input)
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything about studying, revision, or focus..."
                className="h-12 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--text)]"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-medium text-[var(--text)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </form>
          </article>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Quick Prompts</h2>
              <div className="mt-4 space-y-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.title}
                    type="button"
                    onClick={() => void submitPrompt(prompt.prompt)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3 text-left text-sm text-[var(--text)] transition-all hover:opacity-90"
                  >
                    <span className="block font-medium text-[var(--text)]">{prompt.title}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{prompt.prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">How to use</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Set <span className="font-medium text-[var(--text)]">VITE_GEMINI_API_KEY</span> in your local environment, then ask for study plans, explanations, or flashcards.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
