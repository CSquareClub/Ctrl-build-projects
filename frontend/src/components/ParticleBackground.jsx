import React, { useEffect, useState } from 'react';
import './ParticleBackground.css';

const ParticleBackground = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles only on the client side
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1, // 1 to 4px
      duration: Math.random() * 20 + 10, // 10 to 30s
      delay: Math.random() * 5, // 0 to 5s
      op: Math.random() * 0.5 + 0.1 // 0.1 to 0.6 opacity
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="particle-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.op,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
      <div className="ambient-glow bg-blue"></div>
      <div className="ambient-glow bg-purple"></div>
      <div className="ambient-glow bg-right-bloom"></div>
      <div className="light-spread"></div>
    </div>
  );
};

export default ParticleBackground;
