import React, { useEffect, useState } from 'react';
import { Target, Activity, ShieldAlert } from 'lucide-react';
import './Dashboard.css';

const ProgressBar = ({ label, targetValue, colorClass }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Delay animation to trigger on mount
    const timer = setTimeout(() => {
      setWidth(targetValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [targetValue]);

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{width}%</span>
      </div>
      <div className="progress-track">
        <div 
          className={`progress-fill ${colorClass}`} 
          style={{ width: `${width}%` }} 
        />
      </div>
    </div>
  );
};

const Dashboard = ({ scores }) => {
  // scores = { match: 92, fraud: 5, final: 88 }
  const renderScores = scores || { match: 94, fraud: 2, final: 91 };

  return (
    <section className="dashboard-section" id="dashboard">
      <div className="dashboard-container">
        <h2 className="section-title">Analysis Complete</h2>
        <p className="section-subtitle">Comprehensive metrics extracted and validated</p>
        
        <div className="scores-grid">
          
          <div className="score-card glass-panel">
            <div className="score-icon green">
              <Target size={28} />
            </div>
            <div className="score-content">
              <h3>Match Score</h3>
              <p>Skills & Requirements Alignment</p>
              <div className="big-score gradient-green">{renderScores.match}%</div>
            </div>
          </div>

          <div className="score-card glass-panel">
            <div className="score-icon red">
              <ShieldAlert size={28} />
            </div>
            <div className="score-content">
              <h3>Fraud Score</h3>
              <p>Anomaly & Exaggeration Detection</p>
              <div className="big-score gradient-red">{renderScores.fraud}%</div>
            </div>
          </div>

          <div className="score-card glass-panel highlight-card">
            <div className="score-icon blue">
              <Activity size={28} />
            </div>
            <div className="score-content">
              <h3>Final Score</h3>
              <p>Overall Candidate Fit</p>
              <div className="big-score text-gradient">{renderScores.final}%</div>
            </div>
          </div>

        </div>

        <div className="detailed-metrics glass-panel">
          <h3 className="metrics-title">Detailed Metrics Breakdown</h3>
          <ProgressBar label="Technical Skills Match" targetValue={95} colorClass="bg-green" />
          <ProgressBar label="Experience Alignment" targetValue={88} colorClass="bg-blue" />
          <ProgressBar label="Education Match" targetValue={100} colorClass="bg-purple" />
          <ProgressBar label="Risk Indicators" targetValue={renderScores.fraud} colorClass="bg-red" />
        </div>

      </div>
    </section>
  );
};

export default Dashboard;
