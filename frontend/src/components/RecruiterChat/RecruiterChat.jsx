import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, User, Bot } from 'lucide-react';
import { recruiterChat } from '../../api/index';
import './RecruiterChat.css';

const PROMPTS = [
  "Is this candidate strong in Python?",
  "What skills are missing?",
  "Why was this candidate ranked low?",
  "Compare this resume with the JD",
];

export default function RecruiterChat({ resumeId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (question) => {
    const q = question || input.trim();
    if (!q) return;
    setError('');
    setMessages(prev => [...prev, { role: 'user', message: q }]);
    setInput('');
    setLoading(true);
    try {
      const data = await recruiterChat(resumeId, q);
      setMessages(prev => [...prev, { role: 'assistant', message: data.answer, ai_provider: data.ai_provider }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', message: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="rc-section">
      <div className="rc-container">
        <div className="rc-header glass-panel">
          <div className="rc-header-left">
            <div className="rc-icon-wrap"><MessageCircle size={22} /></div>
            <div>
              <h3>Recruiter AI Chat</h3>
              <p>Ask anything about this candidate's resume</p>
            </div>
          </div>
        </div>

        <div className="rc-chat-area glass-panel">
          {messages.length === 0 && (
            <div className="rc-empty">
              <p>Start a conversation about this candidate</p>
              <div className="rc-prompts">
                {PROMPTS.map((p, i) => (
                  <button key={i} className="rc-prompt-chip" onClick={() => sendMessage(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rc-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`rc-msg ${msg.role}`}>
                <div className="rc-msg-avatar">
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="rc-msg-body">
                  <p>{msg.message}</p>
                  {msg.ai_provider && <span className="ai-badge-mini">⚡ {msg.ai_provider}</span>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="rc-msg assistant">
                <div className="rc-msg-avatar"><Bot size={16} /></div>
                <div className="rc-msg-body typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="rc-input-area glass-panel">
          <input
            className="rc-input"
            placeholder="Ask about the candidate..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="rc-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
