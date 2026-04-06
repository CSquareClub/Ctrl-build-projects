import React from 'react';
import { Award, ChevronRight, User } from 'lucide-react';
import './Leaderboard.css';

const mockCandidates = [
  { id: 1, name: "Eleanor Pena", role: "Sr. Frontend Engineer", match: 96, fraud: 2, final: 94 },
  { id: 2, name: "Savannah Nguyen", role: "React Developer", match: 92, fraud: 1, final: 91 },
  { id: 3, name: "Albert Flores", role: "UI/UX Developer", match: 88, fraud: 4, final: 84 },
  { id: 4, name: "Bessie Cooper", role: "Frontend Lead", match: 86, fraud: 8, final: 78 },
  { id: 5, name: "Wade Warren", role: "Web Developer", match: 72, fraud: 15, final: 57 },
];

const Leaderboard = () => {
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
              {mockCandidates.map((candidate, index) => {
                let rankClass = '';
                if (index === 0) rankClass = 'rank-gold top-candidate';
                else if (index === 1) rankClass = 'rank-silver';
                else if (index === 2) rankClass = 'rank-bronze';

                // Cap the stagger class at 5 since we only made up to stagger-5, fallback to stagger-5 if beyond
                const staggerValue = index + 1 <= 5 ? index + 1 : 5;

                return (
                  <tr 
                    key={candidate.id} 
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
            })}
          </tbody>
        </table>
        </div>

      </div>
    </section>
  );
};

export default Leaderboard;
