import React, { useState } from 'react';
import { X, Eye, EyeOff, User, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { login, register, forgotPassword, resetPassword } from '../../api/index';
import './Auth.css';

const VIEWS = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot', RESET: 'reset' };

export default function AuthModal({ onClose }) {
  const { loginSuccess } = useAuth();
  const [view, setView] = useState(VIEWS.LOGIN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const [form, setForm] = useState({ fullName: '', email: '', password: '', token: '', newPassword: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (view === VIEWS.LOGIN) {
        const data = await login(form.email, form.password);
        loginSuccess(data);
        onClose();
      } else if (view === VIEWS.REGISTER) {
        await register(form.fullName, form.email, form.password);
        setSuccess('Account created! You can now log in.');
        setView(VIEWS.LOGIN);
      } else if (view === VIEWS.FORGOT) {
        const data = await forgotPassword(form.email);
        setResetToken(data.reset_token);
        setSuccess(`Reset token (copy this): ${data.reset_token}`);
      } else if (view === VIEWS.RESET) {
        await resetPassword(form.token, form.newPassword);
        setSuccess('Password reset! You can now log in.');
        setView(VIEWS.LOGIN);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal glass-panel" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}><X size={20} /></button>

        {/* Header */}
        <div className="auth-header">
          {view !== VIEWS.LOGIN && (
            <button className="auth-back" onClick={() => { setView(VIEWS.LOGIN); setError(''); setSuccess(''); }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="auth-title">
            {view === VIEWS.LOGIN && 'Welcome Back'}
            {view === VIEWS.REGISTER && 'Create Account'}
            {view === VIEWS.FORGOT && 'Forgot Password'}
            {view === VIEWS.RESET && 'Reset Password'}
          </h2>
          <p className="auth-subtitle">
            {view === VIEWS.LOGIN && 'Sign in to access NexusAI'}
            {view === VIEWS.REGISTER && 'Join the NexusAI recruiter platform'}
            {view === VIEWS.FORGOT && "Enter your email to get a reset token"}
            {view === VIEWS.RESET && 'Enter your reset token and new password'}
          </p>
        </div>

        {/* Alerts */}
        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {view === VIEWS.REGISTER && (
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} />
                <input type="text" placeholder="Jane Doe" value={form.fullName} onChange={set('fullName')} required />
              </div>
            </div>
          )}

          {(view === VIEWS.LOGIN || view === VIEWS.REGISTER || view === VIEWS.FORGOT) && (
            <div className="auth-field">
              <label>Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
          )}

          {(view === VIEWS.LOGIN || view === VIEWS.REGISTER) && (
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} />
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={set('password')} required />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {view === VIEWS.RESET && (
            <>
              <div className="auth-field">
                <label>Reset Token</label>
                <div className="auth-input-wrap">
                  <Lock size={16} />
                  <input type="text" placeholder="Paste reset token" value={form.token} onChange={set('token')} required />
                </div>
              </div>
              <div className="auth-field">
                <label>New Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} />
                  <input type="password" placeholder="New password" value={form.newPassword} onChange={set('newPassword')} required />
                </div>
              </div>
            </>
          )}

          <button className="auth-submit primary-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (
              view === VIEWS.LOGIN ? 'Sign In' :
              view === VIEWS.REGISTER ? 'Create Account' :
              view === VIEWS.FORGOT ? 'Send Reset Token' : 'Reset Password'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="auth-footer">
          {view === VIEWS.LOGIN && (
            <>
              <button className="auth-link" onClick={() => { setView(VIEWS.REGISTER); setError(''); setSuccess(''); }}>
                Don't have an account? Register
              </button>
              <button className="auth-link" onClick={() => { setView(VIEWS.FORGOT); setError(''); setSuccess(''); }}>
                Forgot password?
              </button>
              <button className="auth-link" onClick={() => { setView(VIEWS.RESET); setError(''); setSuccess(''); }}>
                Have a reset token?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
