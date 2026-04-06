import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/client';
import { useUser } from '../context/UserContext';

const ROLES = [
  {
    id: 'student',
    icon: '🎓',
    label: 'Student',
    desc: 'School / College learner looking to understand subjects deeply',
  },
  {
    id: 'job_aspirant',
    icon: '💼',
    label: 'Job Aspirant',
    desc: 'Preparing for UPSC, competitive exams, or private sector jobs',
  },
  {
    id: 'self_learner',
    icon: '🔬',
    label: 'Self Learner',
    desc: 'Curious explorer learning any topic at your own pace',
  },
];

const STEP_LABELS = ['Choose Role', 'Your Profile', 'Review'];

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', age: '', education: '', goal: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleField = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleRoleNext = () => {
    if (!role) { setError('Please select a role to continue.'); return; }
    setError('');
    setStep(2);
  };

  const handleProfileNext = () => {
    const { name, email, password, confirmPassword, age, education, goal } = form;
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !age || !education.trim() || !goal.trim()) {
      setError('Please fill all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        age: Number(form.age),
        education: form.education.trim(),
        goal: form.goal.trim(),
        role,
      });
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err) {
      let msg = 'Registration failed. Please try again.';
      if (err.response?.data?.detail) {
        msg = Array.isArray(err.response.data.detail) 
          ? err.response.data.detail[0].msg 
          : err.response.data.detail;
      }
      setError(msg);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = ROLES.find(r => r.id === role);
  const totalSteps = STEP_LABELS.length;

  return (
    <div className="register-page">
      <div className="register-card fade-in">
        {/* Header */}
        <div className="register-header">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎓</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Join <span className="gradient-text">ChatTutor</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Set up your personalized learning profile
          </p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const isDone = step > num;
            const isActive = step === num;
            return (
              <div key={label} style={{ display: 'contents' }}>
                <div
                  className={`step-dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                  title={label}
                >
                  {isDone ? '✓' : num}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`step-line ${isDone ? 'done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

        {/* ─── Step 1: Role ──────────────────────────────── */}
        {step === 1 && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>
              I am a...
            </h2>
            <div className="role-cards">
              {ROLES.map(r => (
                <div
                  key={r.id}
                  className={`role-card ${role === r.id ? 'selected' : ''}`}
                  onClick={() => { setRole(r.id); setError(''); }}
                >
                  <span className="role-card-icon">{r.icon}</span>
                  <div className="role-card-label">{r.label}</div>
                  <div className="role-card-desc">{r.desc}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full btn-lg" style={{ marginTop: '1.5rem' }} onClick={handleRoleNext}>
              Continue →
            </button>
          </div>
        )}

        {/* ─── Step 2: Profile Form ─────────────────────── */}
        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, textAlign: 'center' }}>
              {roleInfo?.icon} Tell us about yourself
            </h2>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" name="name" value={form.name} onChange={handleField} placeholder="e.g. Priya Sharma" autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handleField} placeholder="e.g. priya@example.com" />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-field-wrap">
                <input className="form-input" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleField} placeholder="Create a password" />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🐵' : '🙈'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="password-field-wrap">
                <input className="form-input" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleField} placeholder="Confirm your password" />
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? '🐵' : '🙈'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-input" name="age" type="number" value={form.age} onChange={handleField} placeholder="e.g. 21" />
            </div>

            <div className="form-group">
              <label className="form-label">Education / Background</label>
              <input className="form-input" name="education" value={form.education} onChange={handleField}
                placeholder={role === 'student' ? 'e.g. BSc Biology 2nd Year' : role === 'job_aspirant' ? 'e.g. BA History Graduate' : 'e.g. Self-taught, Software Engineer'} />
            </div>

            <div className="form-group">
              <label className="form-label">Your Goal</label>
              <textarea className="form-textarea" name="goal" value={form.goal} onChange={handleField}
                placeholder={role === 'student' ? 'e.g. Score 90%+ in Biology, understand reproduction system' : role === 'job_aspirant' ? 'e.g. Clear UPSC Prelims 2025, crack Data Scientist interview at Google' : 'e.g. Master Machine Learning from scratch, understand quantum physics'}
                rows={3} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setStep(1); setError(''); }}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleProfileNext}>Review →</button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Review ──────────────────────────── */}
        {step === 3 && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, textAlign: 'center', marginBottom: '1.5rem' }}>
              Review your profile
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
              {[
                { label: 'Role', value: `${roleInfo?.icon} ${roleInfo?.label}` },
                { label: 'Name', value: form.name },
                { label: 'Email', value: form.email },
                { label: 'Age', value: form.age },
                { label: 'Education', value: form.education },
                { label: 'Goal', value: form.goal },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', padding: '0.7rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setStep(2); setError(''); }} disabled={loading}>← Edit</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : '🚀 Create Profile'}
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--purple-light)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
