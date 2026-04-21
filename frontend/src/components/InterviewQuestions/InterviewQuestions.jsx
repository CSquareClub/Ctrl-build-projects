import React, { useState } from 'react';
import { HelpCircle, Loader2, ChevronDown, ChevronRight, Code, Briefcase, Users, Brain, Zap } from 'lucide-react';
import { generateInterviewQuestions } from '../../api/index';
import './InterviewQuestions.css';

const SECTIONS = [
  { key: 'technical_questions', label: 'Technical', icon: Code, color: 'iq-blue' },
  { key: 'project_questions', label: 'Project', icon: Briefcase, color: 'iq-purple' },
  { key: 'experience_questions', label: 'Experience', icon: Users, color: 'iq-green' },
  { key: 'behavioral_questions', label: 'Behavioral', icon: Brain, color: 'iq-amber' },
  { key: 'follow_up_questions', label: 'Follow-up', icon: ChevronRight, color: 'iq-cyan' },
];

export default function InterviewQuestions({ resumeId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});

  const toggle = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));

  const generate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await generateInterviewQuestions(resumeId);
      setData(res);
      // Open first section by default
      setOpen({ technical_questions: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="iq-section">
      <div className="iq-container">
        <div className="iq-header glass-panel">
          <div className="iq-header-left">
            <div className="iq-icon-wrap"><HelpCircle size={22} /></div>
            <div>
              <h3>Interview Questions</h3>
              <p>AI-generated questions tailored to this candidate</p>
            </div>
          </div>
          {!data && (
            <button className="primary-btn iq-gen-btn" onClick={generate} disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Zap size={16} /> Generate</>}
            </button>
          )}
          {data && <span className="ai-badge">⚡ {data.ai_provider}</span>}
        </div>

        {error && <div className="iq-error">{error}</div>}

        {data && (
          <div className="iq-sections fade-in">
            {SECTIONS.map(({ key, label, icon: Icon, color }) => {
              const questions = data[key] || [];
              if (!questions.length) return null;
              return (
                <div key={key} className={`iq-group glass-panel ${color}`}>
                  <button className="iq-group-header" onClick={() => toggle(key)}>
                    <div className="iq-group-title">
                      <Icon size={18} />
                      <span>{label} Questions</span>
                      <span className="iq-count">{questions.length}</span>
                    </div>
                    {open[key] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  {open[key] && (
                    <ol className="iq-list">
                      {questions.map((q, i) => (
                        <li key={i} className="iq-item">{q}</li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
