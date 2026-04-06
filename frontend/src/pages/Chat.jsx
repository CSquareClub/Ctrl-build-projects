import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { askQuestion } from '../api/client';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';

const WELCOME_MESSAGES = {
  student: "Hi! I'm your AI tutor 🎓. I know you're a student — ask me anything about your subjects, concepts, or exam prep. I'll explain it clearly with examples!",
  job_aspirant: "Hello! I'm your AI career mentor 💼. I know your goal and background — ask me about exam strategies, job interviews, current affairs, or skill-building tips!",
  self_learner: "Hey there, curious learner! 🔬 I'm your AI guide. Ask me about any topic you're exploring — I'll give you deep, conceptual explanations with real-world connections!",
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { user } = useUser();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGES[user?.role] || "Hello! I'm your AI tutor. Ask me anything!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isTyping) return;

    const userMsg = { id: Date.now(), role: 'user', content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await askQuestion(user.id, question);
      const aiMsg = { id: Date.now() + 1, role: 'assistant', content: res.data.answer, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ **Error**: ${err.response?.data?.detail || 'Could not reach the AI. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 61px)', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>💬 AI Chat Tutor</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Personalized for <strong style={{ color: 'var(--purple-light)' }}>{user?.name}</strong> · Powered by Gemini
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>🟢 Online</span>
            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>🧠 Memory: Last 5 chats</span>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className={`message-avatar ${msg.role === 'user' ? 'user-av' : 'ai-av'}`}>
                {msg.role === 'user' ? user?.name?.[0]?.toUpperCase() : '🎓'}
              </div>
              <div>
                <div className={`message-bubble ${msg.role}`}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.9rem' }}>{msg.content}</span>
                  )}
                </div>
                <div className="message-time" style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-message assistant">
              <div className="message-avatar ai-av">🎓</div>
              <div>
                <div className="typing-indicator">
                  <div className="typing-dot" /> <div className="typing-dot" /> <div className="typing-dot" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.25rem' }}>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area" style={{ flexShrink: 0 }}>
          <div className="chat-input-wrap">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder="Ask anything… (Shift+Enter for new line)"
              rows={1}
              disabled={isTyping}
            />
          </div>
          <button className="chat-send-btn" onClick={handleSend} disabled={isTyping || !input.trim()}>
            {isTyping ? <div className="spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} /> : '➤'}
          </button>
        </div>

        {/* Suggested Prompts */}
        {messages.length === 1 && !isTyping && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            {(user?.role === 'student'
              ? ['Explain photosynthesis with examples', 'What is Newton\'s 3rd law?', 'Summarize the French Revolution']
              : user?.role === 'job_aspirant'
              ? ['How to prepare for UPSC Prelims?', 'Common data science interview questions', 'Current affairs for March 2025']
              : ['Explain machine learning simply', 'How does the internet work?', 'What is quantum entanglement?']
            ).map(prompt => (
              <button key={prompt} className="btn btn-ghost btn-sm" onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}>
                {prompt}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
