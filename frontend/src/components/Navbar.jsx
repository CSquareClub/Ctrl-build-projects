import React, { useState } from 'react';
import { Sparkles, BrainCircuit, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './Auth/AuthModal';
import './Navbar.css';

const Navbar = ({ onUploadClick }) => {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <nav className="navbar glass-panel">
        <div className="navbar-container">
          <div className="navbar-brand">
            <BrainCircuit className="brand-icon" size={28} />
            <span className="brand-text text-gradient">NexusAI</span>
          </div>

          <div className="navbar-links">
            <a href="#upload" className="nav-link">Analyze</a>
            <a href="#leaderboard" className="nav-link">Rankings</a>
          </div>

          <div className="navbar-actions">
            {user ? (
              <div className="user-info">
                <div className="user-avatar"><User size={16} /></div>
                <span className="user-name">{user.full_name}</span>
                <button className="nav-auth-btn" onClick={logout} title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button className="nav-auth-btn login-btn" onClick={() => setShowAuth(true)}>
                <LogIn size={16} />
                <span>Login</span>
              </button>
            )}
            <button className="navbar-cta glow-effect" onClick={onUploadClick}>
              <Sparkles size={18} />
              <span>Upload Resume</span>
            </button>
          </div>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
};

export default Navbar;
