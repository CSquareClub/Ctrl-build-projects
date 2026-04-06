import { useState, useRef, useEffect } from 'react';
import { processMessage } from '../utils/chatbotLogic';
import { MessageCircle, X, Send } from 'lucide-react';

export default function Chatbot({ readme, setReadme, isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Welcome to the README Assistant. I can enhance your documentation by adding sections, improving tone, adding badges, and much more. What would you like to improve?' }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Process message
    const { reply, newReadme } = processMessage(input, readme);

    // Simulate typing delay
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
      setReadme(newReadme);
      setTyping(false);
    }, 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Chat Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-96 bg-white border-l border-border shadow-elevation-lg flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-bg-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">README Assistant</h3>
              <p className="text-xs text-text-secondary">AI-powered enhancement</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-border rounded-lg transition text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-primary text-white rounded-br-none'
                    : 'bg-bg-muted text-text-primary rounded-bl-none border border-border'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="bg-bg-muted px-4 py-3 rounded-lg rounded-bl-none border border-border">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        <div className="p-5 border-t border-border bg-bg-subtle">
          <div className="flex gap-2 mb-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="input-base flex-1"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || typing}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-xs text-text-muted space-y-1">
            <p className="font-medium text-text-secondary">Suggestions:</p>
            <p>• "Add badges" • "Make professional" • "Add installation" • "Add features"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
