import { useState } from 'react';
import { generateInterview } from '../api/client';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';

export default function Interview() {
  const { user } = useUser();
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visibleAnswers, setVisibleAnswers] = useState({});

  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    setVisibleAnswers({});
    try {
      const res = await generateInterview(user.id);
      setInterviewData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate interview questions.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (idx) => {
    setVisibleAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        <div className="page-header">
          <h1 className="page-title">Interview Prep</h1>
          <p className="page-subtitle">Practice tailored questions for your target goal.</p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {!interviewData && !loading && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ready to practice?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              We will generate 5 high-yield interview questions tailored to your goal:<br/>
              <strong>{user?.goal}</strong>
            </p>
            <button className="btn btn-primary btn-lg" onClick={fetchQuestions}>
              Generate Questions
            </button>
          </div>
        )}

        {loading && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem', width: 40, height: 40, borderWidth: 4 }} />
            <h3 style={{ fontSize: '1.25rem' }}>Structuring Interview...</h3>
          </div>
        )}

        {!loading && interviewData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Target Role: <span className="gradient-text">{interviewData.role_targeted}</span></h3>
              <button className="btn btn-secondary" onClick={fetchQuestions}>🔄 Generate New</button>
            </div>
            
            {interviewData.questions.map((q, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <h4 style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>
                    <span style={{ color: 'var(--purple-light)', marginRight: '0.5rem' }}>Q{idx + 1}.</span>
                    {q.question}
                  </h4>
                  <button className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => toggleAnswer(idx)}>
                    {visibleAnswers[idx] ? 'Hide Hint' : 'Show Hint'}
                  </button>
                </div>
                {visibleAnswers[idx] && (
                  <div className="fade-in" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--green)' }}>
                    <strong style={{ color: 'var(--green)', display: 'block', marginBottom: '0.5rem' }}>💡 Ideal Answer Hint:</strong>
                    <p style={{ color: 'var(--text-secondary)' }}>{q.answer_hint}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
