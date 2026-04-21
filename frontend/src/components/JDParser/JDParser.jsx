import React, { useState } from 'react';
import { Search, Loader2, Zap, BookOpen, Wrench, Star, AlertCircle } from 'lucide-react';
import { parseJD } from '../../api/index';
import './JDParser.css';

export default function JDParser({ onParsed }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleParse = async () => {
    if (!text.trim() || text.trim().length < 20) {
      setError('Please paste a full job description (at least 20 characters).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await parseJD(text);
      setResult(data);
      if (onParsed) onParsed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const TagGroup = ({ label, items, color }) => (
    items && items.length > 0 ? (
      <div className="jd-tag-group">
        <span className="jd-group-label">{label}</span>
        <div className="tag-list">
          {items.map((item, i) => (
            <span key={i} className={`tag ${color}`}>{item}</span>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <section className="jdparser-section">
      <div className="jdparser-container">
        <div className="jdparser-header">
          <div className="jdparser-icon-wrap"><Search size={22} /></div>
          <div>
            <h3>JD Intelligence Parser</h3>
            <p>Paste a job description to extract structured requirements</p>
          </div>
        </div>

        <textarea
          className="jd-parse-input glass-panel"
          placeholder="Paste full job description here...&#10;&#10;e.g. We are looking for a Senior React Developer with 5+ years of experience..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
        />

        {error && <div className="jdp-error"><AlertCircle size={16} /> {error}</div>}

        <button className="jdp-parse-btn primary-btn" onClick={handleParse} disabled={loading}>
          {loading ? <><Loader2 size={18} className="spin" /> Analyzing JD...</> : <><Zap size={18} /> Parse Job Description</>}
        </button>

        {result && (
          <div className="jdp-result glass-panel fade-in">
            <div className="jdp-result-header">
              <div>
                <h3 className="jdp-role">{result.role_title || 'Role Parsed'}</h3>
                <span className="ai-badge">⚡ {result.ai_provider}</span>
              </div>
              {result.experience_level && (
                <span className="jdp-level-badge">{result.experience_level}</span>
              )}
            </div>

            <TagGroup label="Required Skills" items={result.required_skills} color="tag-green" />
            <TagGroup label="Optional Skills" items={result.optional_skills} color="tag-blue" />
            <TagGroup label="Tools & Technologies" items={result.tools} color="tag-purple" />
            <TagGroup label="Keywords" items={result.keywords} color="tag-amber" />

            {result.responsibilities && result.responsibilities.length > 0 && (
              <div className="jdp-list-section">
                <span className="jd-group-label"><BookOpen size={14} /> Responsibilities</span>
                <ul className="jdp-list">
                  {result.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {result.education && result.education.length > 0 && (
              <div className="jdp-list-section">
                <span className="jd-group-label"><Star size={14} /> Education</span>
                <ul className="jdp-list">
                  {result.education.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
