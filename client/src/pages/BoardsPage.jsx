import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Sidebar from '../components/layout/Sidebar'
import './BoardsPage.css'

const COLORS = ['#0079bf','#70b500','#eb5a46','#f2a600','#c377e0','#ff9f1a','#00c2e0','#51e898','#ff78cb','#344563']

export default function BoardsPage() {
  const [boards, setBoards]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [newTitle, setNewTitle]   = useState('')
  const [newVis, setNewVis]       = useState('private')
  const [error, setError]         = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/boards')
      .then(setBoards)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function createBoard(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      const board = await api.post('/boards', { title: newTitle.trim(), visibility: newVis })
      setBoards((prev) => [board, ...prev])
      setNewTitle('')
      setNewVis('private')
      setCreating(false)
      navigate(`/boards/${board.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const myBoards = boards.filter((b) => b.role === 'owner')
  const invitedBoards = boards.filter((b) => b.role !== 'owner')

  function BoardGrid({ items, offset = 0, showCreate = false }) {
    return (
      <div className="boards-grid">
        {items.map((board, i) => (
          <Link
            key={board.id}
            to={`/boards/${board.id}`}
            className="board-card"
            style={{ '--board-color': COLORS[(i + offset) % COLORS.length] }}
          >
            <div className="board-card-body">
              <span className="board-card-title">{board.title}</span>
              {board.visibility === 'public' && (
                <span className="board-card-badge">Public</span>
              )}
            </div>
            <div className="board-card-meta">
              {board.role === 'owner' ? 'Owner' : board.role}
              {board.member_count > 0 && ` · ${board.member_count} member${board.member_count !== 1 ? 's' : ''}`}
            </div>
          </Link>
        ))}

        {showCreate && (!creating ? (
          <button className="board-card board-card--new" onClick={() => setCreating(true)}>
            + Create new board
          </button>
        ) : (
          <form className="board-create-form" onSubmit={createBoard}>
            <input
              autoFocus
              className="board-create-input"
              placeholder="Board title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
            <select
              className="board-create-select"
              value={newVis}
              onChange={(e) => setNewVis(e.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <div className="board-create-actions">
              <button className="board-create-btn" type="submit">Create board</button>
              <button type="button" className="board-create-cancel" onClick={() => { setCreating(false); setNewTitle('') }}>
                Cancel
              </button>
            </div>
          </form>
        ))}
      </div>
    )
  }

  return (
    <div className="boards-layout">
      <Sidebar boards={boards} />

      <main className="boards-main">
        {error && <p className="boards-error">{error}</p>}

        {loading ? (
          <p className="boards-loading">Loading…</p>
        ) : (
          <>
            <h2 className="boards-heading">My Boards</h2>
            <BoardGrid items={myBoards} offset={0} showCreate />

            {invitedBoards.length > 0 && (
              <>
                <h2 className="boards-heading boards-heading--section">Boards I'm invited to</h2>
                <BoardGrid items={invitedBoards} offset={myBoards.length} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
