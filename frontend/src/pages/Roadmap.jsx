import { useState, useEffect } from 'react';
import { generateRoadmap } from '../api/client';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';

export default function Roadmap() {
  const { user } = useUser();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateRoadmap(user.id);
      setRoadmap(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate roadmap.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        <div className="page-header">
          <h1 className="page-title">Career Adaptive Roadmap</h1>
          <p className="page-subtitle">Your personalized learning path based on your goal: <strong>{user?.goal}</strong></p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {loading && !roadmap && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem', width: 40, height: 40, borderWidth: 4 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Designing your Roadmap...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Analyzing your profile and goal to create the perfect sequence.</p>
          </div>
        )}

        {!loading && roadmap && (
          <div className="roadmap-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            {roadmap.modules.map((mod, index) => (
              <div key={index} className="glass-card" style={{ padding: '1.5rem', position: 'relative', borderLeft: '4px solid var(--purple-mid)' }}>
                <span className="badge badge-purple" style={{ position: 'absolute', top: '-12px', left: '1.5rem' }}>Step {index + 1}</span>
                <h3 style={{ marginTop: '0.5rem', fontSize: '1.25rem' }}>{mod.title}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{mod.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {mod.topics.map((t, idx) => (
                    <span key={idx} style={{ padding: '0.25rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
