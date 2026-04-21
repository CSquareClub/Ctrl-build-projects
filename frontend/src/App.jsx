import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import JDParser from './components/JDParser/JDParser';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import InterviewQuestions from './components/InterviewQuestions/InterviewQuestions';
import RecruiterChat from './components/RecruiterChat/RecruiterChat';
import Leaderboard from './components/Leaderboard';
import ParticleBackground from './components/ParticleBackground';
import CursorGlow from './components/CursorGlow';
import './App.css';

function App() {
  const [parsedJD, setParsedJD] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);

  const handleUploadComplete = (data) => {
    setAnalysisResults(data);
    if (data.resume_id) setResumeId(data.resume_id);
    setUploadCount(c => c + 1); // Trigger leaderboard refresh
    setTimeout(() => {
      document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AuthProvider>
      <div className="app-wrapper">
        <CursorGlow />
        <ParticleBackground />
        <Navbar onUploadClick={scrollToUpload} />

        <main className="main-content">
          <Hero onUploadClick={scrollToUpload} />

          {/* JD Parser Section */}
          <JDParser onParsed={setParsedJD} />

          {/* Upload Section */}
          <UploadSection onUploadComplete={handleUploadComplete} parsedJD={parsedJD} />

          {/* Analysis Dashboard */}
          {analysisResults && (
            <div className="fade-in">
              <Dashboard data={analysisResults} />
            </div>
          )}

          {/* Interview Questions + Chat (only after successful analysis with resume_id) */}
          {resumeId && analysisResults && !analysisResults.is_fake && (
            <div className="fade-in post-analysis-tools">
              <InterviewQuestions resumeId={resumeId} />
              <RecruiterChat resumeId={resumeId} />
            </div>
          )}

          <Leaderboard refreshKey={uploadCount} />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
