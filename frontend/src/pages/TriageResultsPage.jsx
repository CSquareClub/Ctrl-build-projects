import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar';

export default function TriageResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const issue = location.state?.issue || {
    title: 'Authentication failure on secondary cluster nodes during OIDC challenge rotation',
    description: 'During OIDC challenge rotation, secondary cluster nodes are experiencing auth failures. Logs show race condition during crypto key updates.',
  };

  // Mock analysis data (your teammates will replace this with real API data)
  const [analysisData] = useState({
    classification: {
      label: 'BUG',
      confidence: '94%',
    },
    priority: {
      level: 'CRITICAL',
      score: 9.2,
    },
    suggestedLabels: ['cluster', 'NF', 'critical'],
    aiInsights: {
      summary:
        'This issue originates from the auth-provider-v2 module. The logs indicate a race condition during the cryptographic key rotation on non-super nodes. This is highly critical for security.",',
      rootCause: 'Asynchronous state update latency between primary and secondary nodes exceeding 500ms',
      impactScore: 'AI multi-region cluster running enterprise-tier v2.6.0-r1',
    },
    possibleDuplicates: [
      {
        id: 7732,
        title: 'OIDC secret rotation fails under high load',
        similarity: 95,
        status: 'open',
        snippet: '"The secret rotator process seems to hang often the cluster is under heavy write load specifically the secondaries dont receive the heartbeat updates first enough..."',
      },
      {
        id: 7644,
        title: 'Cluster node failure during cert-manager upgrade',
        similarity: 60,
        status: 'closed',
        snippet: '',
      },
    ],
  });

  const handleReanalyze = () => {
    navigate('/');
  };

  const handleMarkResolved = () => {
    alert('Issue marked as resolved!');
  };

  const handleApplyLabels = () => {
    alert(`Applied labels: ${analysisData.suggestedLabels.join(', ')}`);
  };

  const getClassificationColor = (label) => {
    const colors = {
      BUG: 'bg-red-900 text-red-200',
      FEATURE: 'bg-green-900 text-green-200',
      ENHANCEMENT: 'bg-purple-900 text-purple-200',
      DOCUMENTATION: 'bg-blue-900 text-blue-200',
    };
    return colors[label] || 'bg-slate-700 text-slate-200';
  };

  const getPriorityColor = (level) => {
    const colors = {
      CRITICAL: 'bg-red-950 text-red-200 border-red-700',
      HIGH: 'bg-orange-950 text-orange-200 border-orange-700',
      MEDIUM: 'bg-yellow-950 text-yellow-200 border-yellow-700',
      LOW: 'bg-green-950 text-green-200 border-green-700',
    };
    return colors[level] || 'bg-slate-700 text-slate-200';
  };

  return (
    <>
      <TopNavBar currentPage="TRIAGE" />
      <main className="relative pt-14 min-h-screen pb-20">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 hero-gradient pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-mono text-slate-400 mb-8">
            <button
              onClick={() => navigate('/')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              HOME
            </button>
            <span>›</span>
            <span className="text-slate-300">TRIAGE</span>
            <span>›</span>
            <span className="text-slate-300">RESULTS</span>
          </div>

          {/* Issue Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-slate-100 mb-2">{issue.title}</h1>
            <p className="text-slate-400 text-sm">{issue.description}</p>
          </div>

          {/* Analysis Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Classification Card */}
            <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-3">
                Classification
              </h3>
              <div className={`inline-block ${getClassificationColor(analysisData.classification.label)} font-mono font-bold text-sm px-3 py-1 rounded`}>
                {analysisData.classification.label}
              </div>
              <p className="text-slate-300 text-sm mt-3">{analysisData.classification.confidence} confidence</p>
            </div>

            {/* Priority Card */}
            <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-3">
                Priority
              </h3>
              <div className={`inline-block ${getPriorityColor(analysisData.priority.level)} font-mono font-bold text-sm px-3 py-1 rounded border`}>
                ◆ {analysisData.priority.level}
              </div>
              <p className="text-slate-300 text-sm mt-3">Score: {analysisData.priority.score}/10</p>
            </div>

            {/* Suggested Labels Card */}
            <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-3">
                Suggested Labels
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysisData.suggestedLabels.map((label) => (
                  <span
                    key={label}
                    className="bg-slate-700 text-slate-200 font-mono text-xs px-2 py-1 rounded border border-slate-600"
                  >
                    {label} ✕
                  </span>
                ))}
              </div>
              <button
                onClick={handleApplyLabels}
                className="mt-4 w-full bg-tertiary text-slate-950 font-mono text-xs font-bold py-2 rounded hover:bg-opacity-90 transition-all"
              >
                ADD LABELS
              </button>
            </div>
          </div>

          {/* AI Triage Insights Section */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-tertiary text-xl">⭐</span>
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-slate-200">
                AI Triage Insights
              </h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{analysisData.aiInsights.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-outline-variant/30 pt-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">
                  Root Cause
                </p>
                <p className="text-slate-300 text-sm">{analysisData.aiInsights.rootCause}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">
                  Impact Score
                </p>
                <p className="text-slate-300 text-sm">{analysisData.aiInsights.impactScore}</p>
              </div>
            </div>
          </div>

          {/* Possible Duplicates Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-slate-200">
                Possible Duplicates <span className="text-slate-400">{analysisData.possibleDuplicates.length}</span>
              </h3>
            </div>

            <div className="space-y-3">
              {analysisData.possibleDuplicates.map((duplicate) => (
                <div
                  key={duplicate.id}
                  className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 hover:border-primary-container/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-slate-400 text-sm font-mono">#{duplicate.id}</span>
                        <span className="text-slate-300 font-mono text-sm">{duplicate.title}</span>
                        <span className="bg-slate-700 text-slate-200 text-xs font-mono px-2 py-1 rounded">
                          {duplicate.status}
                        </span>
                      </div>
                      {duplicate.snippet && (
                        <p className="text-slate-500 text-xs font-mono border-l-2 border-slate-600 pl-3 py-2">
                          "{duplicate.snippet}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-24 bg-slate-700 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: `${duplicate.similarity}%` }}
                          ></div>
                        </div>
                        <span className="text-slate-400 text-xs font-mono">{duplicate.similarity}%</span>
                      </div>
                    </div>
                    <button className="text-primary-container font-mono text-xs font-bold uppercase tracking-widest hover:underline whitespace-nowrap">
                      VIEW ISSUE →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
            <div className="max-w-5xl mx-auto px-6 flex gap-4 justify-end">
              <button
                onClick={handleReanalyze}
                className="bg-slate-700 text-slate-200 font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-lg hover:bg-slate-600 transition-all border border-slate-600"
              >
                ↻ RE-ANALYZE
              </button>
              <button
                onClick={handleMarkResolved}
                className="bg-tertiary text-slate-950 font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all"
              >
                ✓ MARK RESOLVED
              </button>
              <button
                onClick={handleApplyLabels}
                className="bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-lg hover:opacity-90 transition-all"
              >
                APPLY LABELS
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
