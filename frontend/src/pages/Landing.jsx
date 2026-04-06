import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const FEATURES = [
  { icon: '💬', title: 'AI Chat Tutor', desc: 'Ask anything — get personalized, profile-aware explanations with context memory.' },
  { icon: '📚', title: 'Smart Study Mode', desc: 'Enter any topic and receive structured notes, key points, examples, and practice questions.' },
  { icon: '📝', title: 'Adaptive Mock Tests', desc: 'Auto-generated MCQs with difficulty scaling — easy, medium, or hard, tailored to you.' },
  { icon: '🎯', title: 'Goal-Oriented Learning', desc: 'Supports Students, Job Aspirants & Self-Learners with role-specific content.' },
  { icon: '📄', title: 'Download Notes (PDF)', desc: 'Save your AI-generated notes as beautifully formatted PDFs.' },
  { icon: '🧠', title: 'Context Memory', desc: 'The AI remembers your last 5 conversations to give coherent, progressive answers.' },
];

const ROLES = [
  { icon: '🎓', label: 'Student', desc: 'School / College learners' },
  { icon: '💼', label: 'Job Aspirant', desc: 'UPSC, private sector, interviews' },
  { icon: '🔬', label: 'Self Learner', desc: 'Curiosity-driven, any topic' },
];

export default function Landing() {
  const { user } = useUser();

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-bg" />
        <div className="landing-hero-content fade-in">
          <div className="landing-badge">
            <span className="badge badge-purple">✨ AI-Powered Learning Platform</span>
          </div>

          <h1 className="landing-heading">
            Your Personal<br />
            <span className="gradient-text">AI Tutor</span> Is Here
          </h1>

          <p className="landing-sub">
            ChatTutor adapts to your profile, remembers your conversations, and delivers
            personalized notes, explanations, and quizzes — for students, job seekers, and lifelong learners.
          </p>

          <div className="landing-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                🏠 Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  🚀 Start Learning Free
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Role Badges */}
          <div className="flex gap-1 justify-center" style={{ flexWrap: 'wrap' }}>
            {ROLES.map(r => (
              <span key={r.label} className="badge badge-cyan">
                {r.icon} {r.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Everything You Need to <span className="gradient-text">Excel</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
              From personalized Q&A to mock tests and downloadable PDFs — all powered by Google Gemini AI.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
            Ready to Start <span className="gradient-text">Learning Smarter?</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Join thousands of learners who are already using ChatTutor to achieve their goals.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg" style={{ animation: 'glow 3s ease-in-out infinite' }}>
            🎓 Create Your Profile Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
        © 2025 ChatTutor · Built with ❤️ & Google Gemini AI
      </footer>
    </div>
  );
}
