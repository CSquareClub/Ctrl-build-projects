import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, BarChart3, Users } from 'lucide-react';
import './Hero.css';

const CountUp = ({ end, duration = 2.5, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
};

const Hero = ({ onUploadClick }) => {
  const [typedText, setTypedText] = useState('');
  const fullText = "Leverage futuristic AI algorithms to score and rank candidates instantly. Uncover top talent with unparalleled 95% accuracy.";
  const visualRef = React.useRef(null);

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, currentIdx + 1));
      currentIdx++;
      if (currentIdx >= fullText.length) {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e) => {
    if (!visualRef.current) return;
    const { left, top, width, height } = visualRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    
    // Smooth responsive boundaries (-20deg to +20deg)
    const rotateX = (y - 0.5) * 40; 
    const rotateY = (x - 0.5) * -40;
    
    visualRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
  };

  const handleMouseLeave = () => {
    if (!visualRef.current) return;
    visualRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  return (
    <section className="hero-section" id="about">
      <div className="hero-container">
        
        {/* Left Side: Text Details */}
        <div className="hero-content">
          <div className="badge glass-panel fade-in-up stagger-1">AI-Powered Analysis 2.0</div>
          <h1 className="hero-title fade-in-up stagger-2">
            Smart <span className="text-gradient">Resume</span><br />
            Analyzer
          </h1>
          <p className="hero-subtitle fade-in-up stagger-3">
            {typedText}
            <span className="typing-cursor"></span>
          </p>
          <div className="hero-actions fade-in-up stagger-4">
            <button className="primary-btn glow-effect" onClick={onUploadClick}>
              <UploadCloud size={20} />
              <span>Start Analyzing</span>
            </button>
            <button className="secondary-btn glass-panel">
              View Demo
            </button>
          </div>
        </div>

        {/* Right Side: Visual & Stats */}
        <div className="hero-visual fade-in">
          
          <div className="animate-float">
            <div 
              className="hologram-container 3d-tilt"
              ref={visualRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ transition: 'transform 0.2s ease-out' }}
            >
              <div className="hologram-halo outer"></div>
              <div className="hologram-halo inner"></div>
              <img 
                src="/ai-hologram.png" 
                alt="Holographic AI Brain" 
                className="hologram-image" 
              />
            </div>
          </div>
          
          <div className="stats-container">
            <div className="fade-in-up stagger-2">
              <div className="stat-card glass-panel hover-lift">
                <div className="stat-icon blue"><CheckCircle size={24} /></div>
                <div className="stat-details">
                  <h3><CountUp end={95} suffix="%" /></h3>
                  <p>Accuracy</p>
                </div>
              </div>
            </div>
            
            <div className="fade-in-up stagger-3">
              <div className="stat-card glass-panel hover-lift">
                <div className="stat-icon purple"><Users size={24} /></div>
                <div className="stat-details">
                  <h3><CountUp end={50} suffix="K+" /></h3>
                  <p>Resumes Analyzed</p>
                </div>
              </div>
            </div>
            
            <div className="fade-in-up stagger-4">
              <div className="stat-card glass-panel hover-lift">
                <div className="stat-icon green"><BarChart3 size={24} /></div>
                <div className="stat-details">
                  <h3><CountUp end={10} suffix="K+" /></h3>
                  <p>Companies</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
};

export default Hero;
