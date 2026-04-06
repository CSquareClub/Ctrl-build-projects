import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ onUploadClick }) => {
  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <div className="navbar-brand">
          <BrainCircuit className="brand-icon" size={28} />
          <span className="brand-text text-gradient">NexusAI</span>
        </div>
        
        <div className="navbar-links">
          <a href="#about" className="nav-link">About</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>

        <button className="navbar-cta glow-effect" onClick={onUploadClick}>
          <Sparkles size={18} />
          <span>Upload Resume</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
