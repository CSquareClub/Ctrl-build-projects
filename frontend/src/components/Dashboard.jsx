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
          {(renderScores.metrics || [
            { label: "Technical Skills Match", value: 95, color: "bg-green" },
            { label: "Experience Alignment", value: 88, color: "bg-blue" },
            { label: "Education Match", value: 100, color: "bg-purple" },
            { label: "Risk Indicators", value: renderScores.fraud, color: "bg-red" }
          ]).map((metric, idx) => (
            <ProgressBar 
              key={idx} 
              label={metric.label || metric.name} 
              targetValue={metric.value || metric.score} 
              colorClass={metric.color || (idx === 0 ? 'bg-green' : idx === 1 ? 'bg-blue' : idx === 2 ? 'bg-purple' : 'bg-red')} 
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default Dashboard;
