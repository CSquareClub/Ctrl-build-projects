import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import ParticleBackground from './components/ParticleBackground';
import CursorGlow from './components/CursorGlow';
import './App.css';

function App() {
  const [hasUploaded, setHasUploaded] = useState(false);

  const handleUploadComplete = (file) => {
    setHasUploaded(true);
    // Scroll to dashboard smoothly
    setTimeout(() => {
      document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-wrapper">
      <CursorGlow />
      <ParticleBackground />
      <Navbar onUploadClick={scrollToUpload} />
      
      <main className="main-content">
        <Hero onUploadClick={scrollToUpload} />
        <UploadSection onUploadComplete={handleUploadComplete} />
        
        {hasUploaded && (
          <div className="fade-in">
            <Dashboard />
          </div>
        )}

        <Leaderboard />
      </main>
    </div>
  );
}

export default App;
