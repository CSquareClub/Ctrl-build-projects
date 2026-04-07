import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getAuthErrorMessage, signUp } from '../services/auth'

export function SignupPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await signUp(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--card-shadow)]">
        <h1 className="font-display text-2xl font-semibold text-[var(--text)]">Create account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Start tracking your focus sessions with FocusRoom.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-[var(--muted)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-[var(--muted)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)]"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl primary-gradient-bg px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] transition-all duration-200 disabled:opacity-70"
          >
            {submitting ? 'Creating account...' : 'Signup'}
          </button>

          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted)] transition-all duration-200 hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
          >
            Go to Login
          </Link>
        </form>
      </div>
    </div>
  )
}
