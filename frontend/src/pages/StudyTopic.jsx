import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { generateNotes, downloadNotes, trackProgress } from '../api/client';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';

const QUICK_TOPICS = {
  student: ['Photosynthesis', 'Reproduction System', 'Newton\'s Laws', 'Cell Division', 'French Revolution', 'Calculus Basics'],
  job_aspirant: ['Indian Constitution', 'Fundamental Rights', 'Machine Learning Basics', 'Data Structures', 'Current Affairs', 'SQL Queries'],
  self_learner: ['Quantum Physics', 'Blockchain Technology', 'Neural Networks', 'Philosophy of Mind', 'Climate Change Science', 'Economics 101'],
};

export default function StudyTopic() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [topic, setTopic] = useState(location.state?.presetTopic || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contentId, setContentId] = useState(null);
  const [toast, setToast] = useState('');

  // Auto-generate if preset topic exists
  useState(() => {
    if (location.state?.presetTopic) {
      setTimeout(() => handleGenerate(location.state.presetTopic), 100);
      window.history.replaceState({}, document.title); // clear preset
    }
  });

  const quickTopics = QUICK_TOPICS[user?.role] || QUICK_TOPICS.student;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleGenerate = async (topicOverride) => {
    const t = (topicOverride || topic).trim();
    if (!t) { setError('Please enter a topic.'); return; }
    setError('');
    setLoading(true);
    setNotes('');
    try {
      const res = await generateNotes(user.id, t);
      setNotes(res.data.notes);
      setContentId(res.data.content_id);
      setTopic(t);
      
      // Track progress
      try {
        await trackProgress({
          user_id: user.id,
          activity_type: 'notes',
          topic: t
        });
      } catch (e) { console.error('Tracking error', e); }
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setToast('⏳ Generating PDF...');
      await downloadNotes(user.id, topic);
      setToast('📥 Download completed!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError('Failed to download PDF.');
      setToast('');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">📚 Study Mode</h1>
          <p className="page-subtitle">Enter any topic — get structured notes, key points, examples & practice questions</p>
        </div>

        {/* Topic Input */}
        <div className="study-input-row">
          <div className="form-group" style={{ flex: 1 }}>
            <input
              className="form-input"
              value={topic}
              onChange={e => { setTopic(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g. Photosynthesis, Newton's Laws, Machine Learning..."
              style={{ fontSize: '1rem', padding: '0.875rem 1.25rem' }}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleGenerate()}
            disabled={loading}
            style={{ flexShrink: 0 }}
          >
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Generating...</>
              : '⚡ Generate Notes'
            }
          </button>
        </div>

        {/* Error */}
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="loading-dots" style={{ marginBottom: '1rem' }}>
              <span>✨</span><span>📚</span><span>🤖</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              Generating personalized notes for <strong style={{ color: 'var(--purple-light)' }}>{topic}</strong>...
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              This may take 10–20 seconds
            </p>
          </div>
        )}

        {/* Notes Display */}
        {notes && !loading && (
          <div className="notes-display fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📖 {topic}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Personalized for {user?.name} · {user?.role?.replace('_', ' ')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleGenerate()}>🔄 Regenerate</button>
                <button className="btn btn-primary btn-sm" onClick={handleDownload}>📥 Download PDF</button>
              </div>
            </div>

            <div className="markdown-body">
              <ReactMarkdown>{notes}</ReactMarkdown>
            </div>

            <div className="notes-actions">
              <button className="btn btn-primary" onClick={handleDownload}>📥 Download as PDF</button>
              <button className="btn btn-secondary" onClick={() => { setNotes(''); setTopic(''); }}>📚 Study Another Topic</button>
              <button className="btn btn-ghost" onClick={() => navigate('/quiz')}>📝 Take a Quiz on This</button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="toast-container">
            <div className="toast toast-success">{toast}</div>
          </div>
        )}
      </main>
    </div>
  );
}
