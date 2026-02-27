import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import './ProfilePage.css'

// ── Auth forms (login / register) ────────────────────────────────────────────

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/boards')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 className="auth-title">Log in to EpiTrello</h1>
      {error && <p className="auth-error">{error}</p>}
      <div className="auth-field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </div>
      <div className="auth-field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Log in'}
      </button>
      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/register">Sign up</Link>
      </p>
    </form>
  )
}

function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(email, username, password)
      navigate('/boards')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 className="auth-title">Create your account</h1>
      {error && <p className="auth-error">{error}</p>}
      <div className="auth-field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </div>
      <div className="auth-field">
        <label>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div className="auth-field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <button className="auth-btn" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Sign up'}
      </button>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  )
}

// ── Profile settings ─────────────────────────────────────────────────────────

function ProfileSettings() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername]         = useState(user.username)
  const [currentPw, setCurrentPw]       = useState('')
  const [newPw, setNewPw]               = useState('')
  const [deletePw, setDeletePw]         = useState('')
  const [showDelete, setShowDelete]     = useState(false)
  const [nameMsg, setNameMsg]           = useState(null)
  const [pwMsg, setPwMsg]               = useState(null)
  const [deleteMsg, setDeleteMsg]       = useState(null)
  const [loading, setLoading]           = useState(false)

  async function saveUsername(e) {
    e.preventDefault()
    setNameMsg(null)
    try {
      const data = await api.put('/users/me', { username })
      updateUser({ username: data.user.username })
      setNameMsg({ ok: true, text: 'Username updated.' })
    } catch (err) {
      setNameMsg({ ok: false, text: err.message })
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPwMsg(null)
    try {
      await api.put('/users/me', { currentPassword: currentPw, newPassword: newPw })
      setCurrentPw('')
      setNewPw('')
      setPwMsg({ ok: true, text: 'Password updated.' })
    } catch (err) {
      setPwMsg({ ok: false, text: err.message })
    }
  }

  async function deleteAccount(e) {
    e.preventDefault()
    setDeleteMsg(null)
    setLoading(true)
    try {
      await api.delete('/users/me', { password: deletePw })
      logout()
      navigate('/login')
    } catch (err) {
      setDeleteMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-settings">
      <div className="profile-card">
        <div className="profile-avatar">{user.username[0].toUpperCase()}</div>
        <div>
          <strong>{user.username}</strong>
          <span>{user.email}</span>
        </div>
      </div>

      {/* Change username */}
      <form className="profile-section" onSubmit={saveUsername}>
        <h2 className="profile-section-title">Change username</h2>
        <div className="auth-field">
          <label>New username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        {nameMsg && <p className={`profile-msg${nameMsg.ok ? ' profile-msg--ok' : ' profile-msg--err'}`}>{nameMsg.text}</p>}
        <button className="auth-btn" type="submit">Save username</button>
      </form>

      {/* Change password */}
      <form className="profile-section" onSubmit={savePassword}>
        <h2 className="profile-section-title">Change password</h2>
        <div className="auth-field">
          <label>Current password</label>
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label>New password</label>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
        </div>
        {pwMsg && <p className={`profile-msg${pwMsg.ok ? ' profile-msg--ok' : ' profile-msg--err'}`}>{pwMsg.text}</p>}
        <button className="auth-btn" type="submit">Update password</button>
      </form>

      {/* Danger zone */}
      <div className="profile-section profile-danger-zone">
        <h2 className="profile-section-title profile-danger-title">Danger zone</h2>
        {!showDelete ? (
          <button className="auth-btn auth-btn--danger" onClick={() => setShowDelete(true)}>
            Delete my account
          </button>
        ) : (
          <form onSubmit={deleteAccount}>
            <p className="profile-danger-warn">
              This is permanent and cannot be undone. Enter your password to confirm.
            </p>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} required autoFocus />
            </div>
            {deleteMsg && <p className="profile-msg profile-msg--err">{deleteMsg}</p>}
            <div className="profile-danger-actions">
              <button className="auth-btn auth-btn--danger" type="submit" disabled={loading}>
                {loading ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button type="button" className="auth-btn auth-btn--ghost" onClick={() => setShowDelete(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Page router ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <div className="auth-page"><p className="auth-loading">Loading…</p></div>

  // Protected profile route
  if (pathname === '/profile') {
    if (!user) return <Navigate to="/login" replace />
    return (
      <div className="auth-page">
        <ProfileSettings />
      </div>
    )
  }

  // Already logged in → redirect
  if (user) return <Navigate to="/boards" replace />

  return (
    <div className="auth-page">
      {pathname === '/register' ? <RegisterForm /> : <LoginForm />}
    </div>
  )
}
