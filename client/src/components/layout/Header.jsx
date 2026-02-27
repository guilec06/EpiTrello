import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="header-left">
        <Link to={user ? '/boards' : '/login'} className="header-logo">
          EpiTrello
        </Link>
        {user && (
          <Link to="/boards" className="header-link">My Boards</Link>
        )}
      </div>

      <div className="header-right">
        {user ? (
          <div className="header-user" ref={menuRef}>
            <button
              className="header-avatar"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="User menu"
            >
              {user.username[0].toUpperCase()}
            </button>
            {menuOpen && (
              <div className="header-dropdown">
                <div className="header-dropdown-info">
                  <strong>{user.username}</strong>
                  <span>{user.email}</span>
                </div>
                <hr />
                <Link to="/profile" className="header-dropdown-item" onClick={() => setMenuOpen(false)}>
                  Profile & Settings
                </Link>
                <button className="header-dropdown-item header-dropdown-danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="header-auth">
            <Link to="/login"    className="header-btn header-btn--ghost">Log in</Link>
            <Link to="/register" className="header-btn header-btn--solid">Sign up</Link>
          </div>
        )}
      </div>
    </header>
  )
}
