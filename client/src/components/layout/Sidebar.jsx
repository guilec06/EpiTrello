import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar({ boards = [] }) {
  const { pathname } = useLocation()

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-label">Your boards</p>
        {boards.length === 0 ? (
          <p className="sidebar-empty">No boards yet</p>
        ) : (
          <ul className="sidebar-list">
            {boards.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/boards/${b.id}`}
                  className={`sidebar-item${pathname === `/boards/${b.id}` ? ' sidebar-item--active' : ''}`}
                >
                  <span className="sidebar-item-title">{b.title}</span>
                  {b.visibility === 'public' && (
                    <span className="sidebar-badge">Public</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
