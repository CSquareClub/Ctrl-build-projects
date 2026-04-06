import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="navbar-logo">
          <div className="navbar-logo-icon">🎓</div>
          <span className="gradient-text">ChatTutor</span>
        </Link>

        <div className="navbar-nav">
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={toggleTheme}
            style={{ fontSize: '1.2rem', padding: '0.4rem', border: 'none' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          
          {!user ? (
            <>
              <Link to="/register" className="nav-link">Register</Link>
              <Link to="/login"    className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started →</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <span className="badge badge-purple" style={{ marginRight: '0.5rem' }}>
                {user.name}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { logout(); navigate('/'); }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
