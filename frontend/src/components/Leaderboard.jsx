import React, { useState, useEffect } from 'react';
import { Award, ChevronRight, User, FileText, RefreshCw } from 'lucide-react';
import { fetchRankings } from '../api/index';
import './Leaderboard.css';

const Leaderboard = ({ refreshKey }) => {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchRankings();
        // Backend returns { ranked_resumes: [...] }
        const list = data.ranked_resumes || data || [];
        setCandidates(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error fetching rankings:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [refreshKey]); // Re-fetch when refreshKey changes (after upload)

  const reload = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchRankings();
      const list = data.ranked_resumes || data || [];
      setCandidates(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="leaderboard-section" id="leaderboard">
      <div className="leaderboard-container">
        <div className="leaderboard-title-row">
          <div>
            <h2 className="section-title">Global Ranking</h2>
            <p className="section-subtitle">Top-ranked candidates across all active positions</p>
          </div>
          <button className="refresh-btn" onClick={reload} disabled={isLoading} title="Refresh rankings">
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="lb-error">
            ⚠️ {error}
          </div>
        )}

        <div className="table-wrapper glass-panel">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Resume</th>
              <th>Match</th>
              <th>Fraud</th>
              <th>Final Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  Fetching Top Candidates...
                </td>
              </tr>
            ) : candidates.length > 0 ? (
              candidates.map((c, index) => {
                let rankClass = '';
                if (index === 0) rankClass = 'rank-gold top-candidate';
                else if (index === 1) rankClass = 'rank-silver';
                else if (index === 2) rankClass = 'rank-bronze';
                const staggerValue = Math.min(index + 1, 5);

                // Map backend fields
                const matchScore = c.match_score != null ? (c.match_score > 1 ? c.match_score : Math.round(c.match_score * 100)) : 0;
                const fraudScore = c.fraud_score ?? 0;
                const finalScore = c.score != null ? (c.score > 1 ? c.score : Math.round(c.score * 100)) : 0;
                const displayName = c.name || c.filename || `Resume #${c.resume_id || index + 1}`;

                return (
                  <tr
                    key={c.resume_id || index}
                    className={`table-row ${rankClass} hover-lift fade-in-up stagger-${staggerValue}`}
                  >
                    <td className="rank-cell">
                      {index <= 2 ? (
                        <div className={`rank-badge ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`}>
                          <Award size={18} />
                        </div>
                      ) : (
                        <span className="rank-num">#{index + 1}</span>
                      )}
                    </td>
                    <td>
                      <div className="candidate-info">
                        <div className="avatar">
                          {c.filename ? <FileText size={18} /> : <User size={18} />}
                        </div>
                        <div>
                          <h4>{displayName}</h4>
                          {c.role && <span className="role">{c.role}</span>}
                          {c.resume_id && <span className="role">ID: {c.resume_id}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="score-badge blue">{matchScore}%</span>
                    </td>
                    <td>
                      <span className={`score-badge ${fraudScore > 10 ? 'red' : 'green'}`}>
                        {fraudScore}%
                      </span>
                    </td>
                    <td>
                      <strong className="final-score">{finalScore}</strong>
                    </td>
                    <td>
                      <button className="icon-btn">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                  No ranked candidates yet. Upload resumes to populate rankings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;
