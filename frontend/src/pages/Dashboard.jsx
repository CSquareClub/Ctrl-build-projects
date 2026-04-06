import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getProgress } from '../api/client';
import Sidebar from '../components/Sidebar';

const ROLE_INFO = {
  student:      { icon: '🎓', label: 'Student',       color: 'var(--purple-light)' },
  job_aspirant: { icon: '💼', label: 'Job Aspirant',  color: 'var(--cyan)' },
  self_learner: { icon: '🔬', label: 'Self Learner',  color: 'var(--green)' },
};

const DASH_CARDS = [
  { to: '/roadmap', icon: '🗺️', title: 'Adaptive Roadmap', desc: 'Generate your step-by-step master plan.', badge: 'New', badgeClass: 'badge-orange' },
  { to: '/chat', icon: '💬', title: 'AI Chat Tutor', desc: 'Ask questions with context memory.', badge: 'Most Used', badgeClass: 'badge-purple' },
  { to: '/study', icon: '📚', title: 'Study Mode', desc: 'Generate structured markdown notes.', badge: 'Generate', badgeClass: 'badge-cyan' },
  { to: '/quiz', icon: '📝', title: 'Mock Test (20 Qs)', desc: 'Test yourself with deep score reports.', badge: 'Auto-Graded', badgeClass: 'badge-green' },
  { to: '/interview', icon: '🎤', title: 'Interview Q&A', desc: 'Practice role-specific interview questions.', badge: 'Hot', badgeClass: 'badge-purple' },
];



export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ modules: 0, quizzes: 0, avgScore: 0 });
  const roleInfo = ROLE_INFO[user?.role] || { icon: '👤', label: user?.role, color: 'var(--purple-mid)' };
  
  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await getProgress(user.id);
      const history = res.data.history || [];
      const quizzes = history.filter(h => h.activity_type === 'quiz' && h.score != null && h.total_questions > 0);
      const modules = history.filter(h => h.activity_type === 'notes');
      
      const avgScore = quizzes.length ? 
        Math.round(quizzes.reduce((acc, curr) => acc + (curr.score / curr.total_questions) * 100, 0) / quizzes.length) : 0;
        
      setStats({
        modules: modules.length,
        quizzes: quizzes.length,
        avgScore
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        {/* Profile Strip */}
        <div className="profile-strip">
          <div className="profile-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="profile-info">
            <h3>{greeting}, {user?.name}! 👋</h3>
            <p>{roleInfo.icon} {roleInfo.label} · {user?.education}</p>
          </div>
          <div className="profile-meta">
            <span className="badge badge-purple">🎯 {user?.goal?.slice(0, 40)}{user?.goal?.length > 40 ? '...' : ''}</span>
          </div>
        </div>

        {/* Daily Tracking Report */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📈 Daily Tracking Report</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--purple-light)' }}>{stats.modules}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Topics Studied</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cyan)' }}>{stats.quizzes}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mock Tests Taken</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>{stats.avgScore}%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Score</div>
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span>Weekly Progress Goal</span>
              <span style={{ color: 'var(--purple-light)', fontWeight: 700 }}>{Math.min(stats.modules * 10, 100)}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(stats.modules * 10, 100)}%`, background: 'var(--purple-glow)', transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>



        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="page-title" style={{ fontSize: '1.5rem' }}>All Learning Tools</h2>
        </div>

        {/* Dashboard Cards */}
        <div className="dashboard-grid">
          {DASH_CARDS.map(card => (
            <Link key={card.to} to={card.to} className="dash-card">
              <div className="dash-card-icon">{card.icon}</div>
              <div>
                <div className="dash-card-title">{card.title}</div>
                <div className="dash-card-desc">{card.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span className={`badge ${card.badgeClass}`}>{card.badge}</span>
                <span className="dash-card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
