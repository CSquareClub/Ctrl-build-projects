import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const ROLE_LABELS = {
  student: { label: 'Student', icon: '🎓' },
  job_aspirant: { label: 'Job Aspirant', icon: '💼' },
  self_learner: { label: 'Self Learner', icon: '🔬' },
};

const NAV_ITEMS = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/roadmap', icon: '🗺️', label: 'Learning Roadmap' },
  { to: '/chat', icon: '💬', label: 'AI Chat Tutor' },
  { to: '/study', icon: '📚', label: 'Study Mode' },
  { to: '/quiz', icon: '📝', label: 'Mock Tests' },
  { to: '/interview', icon: '🎤', label: 'Interview Prep' },
  { to: '/history', icon: '📋', label: 'History' },
];

export default function Sidebar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const roleInfo = ROLE_LABELS[user?.role] || { label: user?.role, icon: '👤' };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      {/* User Profile */}
      {user && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple-mid), var(--cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.875rem', color: 'white', flexShrink: 0
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{roleInfo.icon} {roleInfo.label}</div>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-section">Navigation</div>
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <span className="sidebar-icon">{icon}</span>
          {label}
        </NavLink>
      ))}

      {/* Logout */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} className="sidebar-item btn-ghost" style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-secondary)', fontFamily: 'inherit', textAlign: 'left' }}>
          <span className="sidebar-icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
