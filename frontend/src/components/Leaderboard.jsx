import React from 'react';
import { Award, ChevronRight, User } from 'lucide-react';
import './Leaderboard.css';

const Leaderboard = () => {
  const [candidates, setCandidates] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch('http://10.224.213.198:8000/rank');
        const data = await response.json();
        setCandidates(data);
      } catch (error) {
        console.error('Error fetching rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRankings();
  }, []);
  return (
    <section className="leaderboard-section" id="leaderboard">
      <div className="leaderboard-container">
        
        <div className="leaderboard-header">
          <h2 className="section-title">Global Ranking</h2>
          <p className="section-subtitle">Top candidates benchmarked across all requirements</p>
        </div>

        <div className="table-wrapper glass-panel">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Match Score</th>
                <th>Fraud Score</th>
                <th>Final Score</th>
                <th>Action</th>
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
                candidates.map((candidate, index) => {
                  let rankClass = '';
                  if (index === 0) rankClass = 'rank-gold top-candidate';
                  else if (index === 1) rankClass = 'rank-silver';
                  else if (index === 2) rankClass = 'rank-bronze';

                  const staggerValue = index + 1 <= 5 ? index + 1 : 5;

                  return (
                    <tr 
                      key={candidate.id || index} 
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
                          <User size={18} />
                        </div>
                        <div>
                          <h4>{candidate.name}</h4>
                          <span className="role">{candidate.role}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="score-badge blue">{candidate.match}%</span>
                    </td>
                    <td>
                      <span className={`score-badge ${candidate.fraud > 10 ? 'red' : 'green'}`}>
                        {candidate.fraud}%
                      </span>
                    </td>
                    <td>
                      <strong className="final-score">{candidate.final}</strong>
                    </td>
                    <td>
                      <button className="icon-btn">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                    No candidates found in the system.
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
