import { useState, useEffect } from 'react';
import { generateQuiz, trackProgress } from '../api/client';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';

const DIFFICULTIES = [
  { id: 'easy',   icon: '🟢', label: 'Easy',   desc: 'Basic definitions & facts' },
  { id: 'medium', icon: '🟡', label: 'Medium',  desc: 'Conceptual & applied' },
  { id: 'hard',   icon: '🔴', label: 'Hard',    desc: 'Analytical & reasoning' },
];

const QUICK_TOPICS = {
  student:      ['Photosynthesis', 'Newton\'s Laws', 'Cell Division', 'French Revolution'],
  job_aspirant: ['Indian Constitution', 'Fundamental Rights', 'Data Structures', 'Current Affairs'],
  self_learner: ['Machine Learning', 'Quantum Physics', 'Economics', 'Climate Science'],
};

function QuizSetup({ onStart, user }) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const quickTopics = QUICK_TOPICS[user?.role] || QUICK_TOPICS.student;

  const handleStart = async (topicOverride) => {
    const t = (topicOverride || topic).trim();
    if (!t) { setError('Please enter a topic.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await generateQuiz(user.id, t, difficulty);
      onStart(res.data.questions, t, difficulty);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-setup fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📝</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Mock Test Generator</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Personalized MCQs for {user?.name} · 10 questions
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">Quiz Topic</label>
          <input
            className="form-input"
            value={topic}
            onChange={e => { setTopic(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="e.g. Photosynthesis, Indian Constitution..."
            style={{ fontSize: '1rem' }}
          />
        </div>

        <div>
          <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Difficulty Level</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {DIFFICULTIES.map(d => (
              <div
                key={d.id}
                className={`role-card ${difficulty === d.id ? 'selected' : ''}`}
                style={{ padding: '1rem', cursor: 'pointer' }}
                onClick={() => setDifficulty(d.id)}
              >
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.4rem' }}>{d.icon}</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>



        <button
          className="btn btn-primary btn-lg w-full"
          onClick={() => handleStart()}
          disabled={loading}
        >
          {loading
            ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Generating 10 Questions...</>
            : '🚀 Start Quiz'}
        </button>
      </div>
    </div>
  );
}


function QuizQuestion({ question, index, total, onSelect, selectedLabel }) {
  const handleSelect = (label) => {
    onSelect(label);
  };

  const getOptionClass = (label) => {
    return selectedLabel === label ? 'selected' : '';
  };

  return (
    <div className="quiz-card glass-card fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span className="badge badge-purple">Q{index + 1} / {total}</span>
      </div>

      <div className="question-text">{question.question}</div>

      <div className="quiz-options">
        {question.options.map(opt => (
          <div
            key={opt.label}
            className={`quiz-option ${getOptionClass(opt.label)}`}
            onClick={() => handleSelect(opt.label)}
          >
            <div className="option-label">{opt.label}</div>
            <span>{opt.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ score, total, topic, onRetry, onNew, answers, questions }) {
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 80 ? { label: 'Excellent! 🏆', color: 'var(--green)' }
    : pct >= 60 ? { label: 'Good Job! 👍', color: 'var(--cyan)' }
    : { label: 'Keep Practicing! 💪', color: 'var(--orange)' };

  return (
    <div className="score-card-container fade-in">
      <div className="score-card glass-card" style={{ marginBottom: '2rem' }}>
        <div className="score-circle">
          <div className="score-number">{score}</div>
          <div className="score-total">/ {total}</div>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: grade.color, marginBottom: '0.5rem' }}>
          {grade.label}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
          You scored <strong style={{ color: 'var(--purple-light)' }}>{pct}%</strong> on <em>{topic}</em>
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          {score} correct out of {total} questions
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onRetry}>🔄 Retry Same Quiz</button>
          <button className="btn btn-secondary" onClick={onNew}>📝 Dashboard setup</button>
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Detailed Review Review</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {questions.map((q, idx) => {
          const ans = answers[idx];
          const isCorrect = ans?.isCorrect;
          return (
            <div key={idx} className="glass-card" style={{ padding: '1.5rem', borderLeft: isCorrect ? '4px solid var(--green)' : '4px solid var(--orange)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', flex: 1, paddingRight: '1rem' }}>Q{idx + 1}. {q.question}</h4>
                {isCorrect ? <span className="badge badge-green">Correct ✅</span> : <span className="badge badge-orange">Wrong ❌</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                {q.options.map(opt => {
                  let bg = 'var(--bg-secondary)';
                  let col = 'var(--text-primary)';
                  if (opt.label === q.correct) {
                    bg = 'rgba(16, 185, 129, 0.1)';
                    col = 'var(--green)';
                  } else if (ans?.label === opt.label && !ans?.isCorrect) {
                    bg = 'rgba(239, 68, 68, 0.1)';
                    col = 'var(--orange)';
                  }
                  
                  return (
                    <div key={opt.label} style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: bg, border: '1px solid var(--border)', fontSize: '0.9rem', color: col }}>
                      <strong>{opt.label}.</strong> {opt.text}
                      {opt.label === q.correct && <span style={{ float: 'right' }}>🎯 Correct Answer</span>}
                      {ans?.label === opt.label && !ans?.isCorrect && <span style={{ float: 'right' }}>Your Answer</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                <strong>Explanation: </strong> {q.explanation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function MockTest() {
  const { user } = useUser();
  const [phase, setPhase] = useState('setup'); // setup | quiz | done
  const [questions, setQuestions] = useState([]);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);

  const handleStart = (qs, t, d) => {
    setQuestions(qs);
    setTopic(t);
    setDifficulty(d);
    setAnswers({});
    setCurrentQ(0);
    setScore(0);
    setPhase('quiz');
  };

  const finalizeTest = async () => {
    // Calculate final score
    let finalScore = 0;
    const evaluatedAnswers = {};
    
    questions.forEach((q, idx) => {
      const selectedLabel = answers[idx];
      const isCorrect = selectedLabel === q.correct;
      if (isCorrect) finalScore++;
      evaluatedAnswers[idx] = { label: selectedLabel, isCorrect };
    });

    setScore(finalScore);
    setAnswers(evaluatedAnswers);
    setPhase('done');

    try {
      await trackProgress({
        user_id: user.id,
        activity_type: 'quiz',
        topic: topic,
        score: finalScore,
        total_questions: questions.length
      });
    } catch (e) { console.error('Tracking Error:', e); }
  };

  const handleSelect = (idx, label) => {
    setAnswers(prev => ({ ...prev, [idx]: label }));
  };

  const handleRetry = () => {
    // Convert evaluated answers back to simple labels for retry
    const plainAnswers = {};
    Object.keys(answers).forEach(k => {
      plainAnswers[k] = answers[k].label;
    });
    setAnswers(plainAnswers);
    setCurrentQ(0);
    setScore(0);
    setPhase('quiz');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        <div className="page-header">
          <h1 className="page-title">📝 Mock Test</h1>
          <p className="page-subtitle">Adaptive MCQ quizzes · Goal-oriented · Review Results after Submission</p>
        </div>

        {phase === 'setup' && <QuizSetup onStart={handleStart} user={user} />}

        {phase === 'quiz' && questions.length > 0 && (
          <div className="quiz-container fade-in">
            <div className="quiz-progress">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <span>📍 Question {currentQ + 1} of {questions.length}</span>
                <span>Select your answer to proceed</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span className="badge badge-purple">📚 {topic}</span>
              <span className="badge badge-cyan" style={{ marginLeft: '0.5rem' }}>⚡ {difficulty}</span>
            </div>

            <QuizQuestion
              key={currentQ}
              question={questions[currentQ]}
              index={currentQ}
              total={questions.length}
              selectedLabel={answers[currentQ]}
              onSelect={(label) => handleSelect(currentQ, label)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                disabled={currentQ === 0}
                style={{ flex: 1 }}
              >
                ← Previous
              </button>
              
              {currentQ < questions.length - 1 ? (
                <button 
                  className="btn btn-primary" 
                  onClick={() => setCurrentQ(prev => prev + 1)}
                  style={{ flex: 1 }}
                >
                  Next →
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={finalizeTest}
                  style={{ flex: 1, background: 'var(--green)' }}
                >
                  ✅ Submit Test
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <ScoreCard
            score={score}
            total={questions.length}
            topic={topic}
            onRetry={handleRetry}
            onNew={() => setPhase('setup')}
            answers={answers}
            questions={questions}
          />
        )}
      </main>
    </div>
  );
}
