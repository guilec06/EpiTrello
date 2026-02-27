import { useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import './MemberModal.css'

export default function MemberModal({ boardId, members: initialMembers, currentUser, ownerId, onClose, onMembersChanged }) {
  const [members, setMembers] = useState(initialMembers)
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('viewer')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const isOwner = currentUser?.id === ownerId

  async function addMember(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const newMember = await api.post(`/boards/${boardId}/members`, { email: email.trim(), memberRole: role })
      const next = [...members.filter((m) => m.id !== newMember.id), newMember]
      setMembers(next)
      onMembersChanged(next)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function changeRole(userId, newRole) {
    try {
      await api.put(`/boards/${boardId}/members/${userId}`, { memberRole: newRole })
      const next = members.map((m) => m.id === userId ? { ...m, role: newRole } : m)
      setMembers(next)
      onMembersChanged(next)
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeMember(userId) {
    try {
      await api.delete(`/boards/${boardId}/members/${userId}`)
      const next = members.filter((m) => m.id !== userId)
      setMembers(next)
      onMembersChanged(next)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal title="Board members" onClose={onClose}>
      {error && <p className="mm-error">{error}</p>}

      {/* Current members list */}
      <div className="mm-list">
        {members.length === 0 && (
          <p className="mm-empty">No members yet. Add collaborators below.</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="mm-member">
            <div className="mm-avatar">{m.username[0].toUpperCase()}</div>
            <div className="mm-info">
              <strong>{m.username}</strong>
              <span>{m.email}</span>
            </div>
            {isOwner ? (
              <div className="mm-controls">
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value)}
                  className="mm-select"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button className="mm-remove" onClick={() => removeMember(m.id)} title="Remove">✕</button>
              </div>
            ) : (
              <span className="mm-role-badge mm-role-badge--{m.role}">{m.role}</span>
            )}
          </div>
        ))}
      </div>

      {/* Add member form (owner only) */}
      {isOwner && (
        <form onSubmit={addMember} className="mm-form">
          <p className="mm-form-title">Add member</p>
          <div className="mm-form-row">
            <input
              className="mm-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select className="mm-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button className="mm-btn" type="submit" disabled={loading}>
              {loading ? '…' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
