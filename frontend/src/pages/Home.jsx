import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar';

export default function Home() {
  const navigate = useNavigate();
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyzeIssue = async (e) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDescription.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    setLoading(true);
    try {
      // Pass issue data to analysis page
      const issueData = {
        title: issueTitle,
        description: issueDescription,
        timestamp: new Date().toISOString(),
      };
      
      // Navigate to analysis page with state
      navigate('/triage', { state: { issue: issueData } });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNavBar currentPage="HOME" />
      <main className="relative pt-14 min-h-screen overflow-hidden">
        {/* Subtle Dot Grid Background */}
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 hero-gradient pointer-events-none"></div>

        <section className="max-w-7xl mx-auto px-6 py-20 relative z-10 flex flex-col items-center">
          {/* Hero Section */}
          <div className="text-center mb-16 max-w-2xl">
            <h1 className="font-mono font-bold text-[48px] leading-tight tracking-tighter text-slate-100 mb-4">
              Triage Issues. <span className="text-[#58a6ff]">Instantly.</span>
            </h1>
            <p className="text-[16px] text-[#8b949e] font-body">
              Automate your open-source maintenance. Identify duplicates, assign labels, and track
              SLOs with neural-engine precision.
            </p>
          </div>

          {/* Submit Card */}
          <div className="w-full max-w-[680px] bg-surface-container border border-outline-variant/30 rounded-[12px] p-[32px] shadow-2xl">
            <form onSubmit={handleAnalyzeIssue} className="space-y-6">
              {/* Issue Title Input */}
              <div className="space-y-2">
                <label className="block font-mono text-xs uppercase tracking-widest text-slate-400">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="Briefly describe the bug or feature request..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container transition-all terminal-glow"
                  disabled={loading}
                />
              </div>

              {/* Issue Description Input */}
              <div className="space-y-2">
                <label className="block font-mono text-xs uppercase tracking-widest text-slate-400">
                  Issue Description
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Provide context, reproduction steps, or expected behavior..."
                  rows="6"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container transition-all terminal-glow resize-none"
                  disabled={loading}
                />
              </div>

              {/* Analyze Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[48px] bg-[#58a6ff] text-background font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-[#79c0ff] hover:-translate-y-[1px] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Issue
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </>
                  )}
                </button>
                <p className="mt-4 text-center text-[12px] text-[#484f58] font-mono">
                  ⚡ Powered by OpenAI text-embedding-3-small
                </p>
              </div>
            </form>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-16">
            {/* Card 1 - Deduplication */}
            <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 hover:border-primary-container/50 hover:bg-surface-container-high transition-all group">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center mb-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary-container">content_copy</span>
              </div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-tight text-slate-100 mb-2">
                Deduplication
              </h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Vector-based similarity checks to catch duplicate issues before they clutter your backlog.
              </p>
            </div>

            {/* Card 2 - Auto-Labeling */}
            <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 hover:border-primary-container/50 hover:bg-surface-container-high transition-all group">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center mb-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-tertiary">label</span>
              </div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-tight text-slate-100 mb-2">
                Auto-Labeling
              </h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Intelligent categorization using custom LLM models trained on your project's unique taxonomy.
              </p>
            </div>

            {/* Card 3 - SLO Tracking */}
            <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 hover:border-primary-container/50 hover:bg-surface-container-high transition-all group">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center mb-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-error">timer</span>
              </div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-tight text-slate-100 mb-2">
                SLO Tracking
              </h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Monitor response times and resolution health with automated alerts for critical regressions.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Visual Accent Element */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-20"></div>
    </>
  );
}
