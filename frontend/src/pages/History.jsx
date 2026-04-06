import { useState, useEffect } from 'react';
import { getHistory } from '../api/client';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function History() {
  const { user } = useUser();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory(user.id);
      setConversations(res.data.conversations.reverse()); // newest first
    } catch (err) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">📋 Chat History</h1>
            <p className="page-subtitle">Your learning journey — all past AI conversations</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchHistory}>🔄 Refresh</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading your conversations...</p>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && conversations.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">💬</span>
            <div className="empty-title">No conversations yet</div>
            <div className="empty-desc">Start chatting with your AI tutor to build your history.</div>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <>
            <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} · Click to expand
            </div>
            <div>
              {conversations.map((conv, i) => (
                <div
                  key={i}
                  className="history-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="history-q">
                        <span style={{ color: 'var(--purple-light)', marginRight: '0.5rem' }}>Q:</span>
                        {conv.question}
                      </div>
                      {expanded !== i && (
                        <div className="history-a" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.answer.slice(0, 120)}...
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(conv.timestamp)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{expanded === i ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded === i && (
                    <div
                      className="fade-in"
                      style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)' }}
                    >
                      <div style={{ fontSize: '0.85rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: '0.5rem' }}>AI Answer:</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {conv.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
