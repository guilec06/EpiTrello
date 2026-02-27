import { useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../api/client'
import './CardModal.css'

const TAG_PALETTE = ['#0052cc','#0079bf','#61bd4f','#f2a600','#eb5a46','#c377e0','#ff9f1a','#00c2e0','#51e898','#ff78cb']

export default function CardModal({ card, boardTags, boardId, onClose, onCardUpdated, onCardDeleted }) {
  const [title, setTitle]           = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [cardTags, setCardTags]     = useState(card.tags || [])
  const [newTagName, setNewTagName]  = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0])
  const [addingTag, setAddingTag]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  async function saveTitle() {
    if (title === card.title) return
    try {
      await api.put(`/cards/${card.id}`, { title })
      onCardUpdated({ ...card, title, tags: cardTags })
    } catch (e) {
      setTitle(card.title)
      setError(e.message)
    }
  }

  async function saveDescription() {
    if (description === (card.description || '')) return
    try {
      await api.put(`/cards/${card.id}`, { description })
      onCardUpdated({ ...card, title, description, tags: cardTags })
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleTag(tag) {
    const applied = cardTags.some((t) => t.id === tag.id)
    try {
      if (applied) {
        await api.delete(`/cards/${card.id}/tags/${tag.id}`)
        const next = cardTags.filter((t) => t.id !== tag.id)
        setCardTags(next)
        onCardUpdated({ ...card, title, description, tags: next })
      } else {
        await api.post(`/cards/${card.id}/tags/${tag.id}`)
        const next = [...cardTags, tag]
        setCardTags(next)
        onCardUpdated({ ...card, title, description, tags: next })
      }
    } catch (e) {
      setError(e.message)
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return
    try {
      const tag = await api.post(`/boards/${boardId}/tags`, { name: newTagName.trim(), color: newTagColor })
      setNewTagName('')
      setAddingTag(false)
      // Auto-apply the new tag
      await api.post(`/cards/${card.id}/tags/${tag.id}`)
      const next = [...cardTags, tag]
      setCardTags(next)
      onCardUpdated({ ...card, title, description, tags: next, _newTag: tag })
    } catch (e) {
      setError(e.message)
    }
  }

  async function deleteCard() {
    if (!confirm('Delete this card?')) return
    try {
      await api.delete(`/cards/${card.id}`)
      onCardDeleted(card.id)
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  // Combine existing board tags with any newly created ones
  const allBoardTags = [
    ...boardTags,
    ...cardTags.filter((ct) => !boardTags.some((bt) => bt.id === ct.id)),
  ]

  return (
    <Modal title="Card" onClose={onClose}>
      {error && <p className="cm-error">{error}</p>}

      <div className="cm-field">
        <label className="cm-label">Title</label>
        <input
          className="cm-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Description</label>
        <textarea
          className="cm-textarea"
          rows={4}
          placeholder="Add a description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">Tags</label>
        <div className="cm-tags">
          {allBoardTags.map((tag) => {
            const active = cardTags.some((t) => t.id === tag.id)
            return (
              <button
                key={tag.id}
                className={`cm-tag${active ? ' cm-tag--active' : ''}`}
                style={{ '--tag-color': tag.color }}
                onClick={() => toggleTag(tag)}
              >
                {tag.name}
              </button>
            )
          })}
          {!addingTag && (
            <button className="cm-tag-add" onClick={() => setAddingTag(true)}>+ New tag</button>
          )}
        </div>

        {addingTag && (
          <div className="cm-newtag">
            <input
              className="cm-input"
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTag()}
              autoFocus
            />
            <div className="cm-palette">
              {TAG_PALETTE.map((c) => (
                <button
                  key={c}
                  className={`cm-swatch${newTagColor === c ? ' cm-swatch--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewTagColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="cm-newtag-actions">
              <button className="cm-btn cm-btn--primary" onClick={createTag} disabled={!newTagName.trim()}>
                Create
              </button>
              <button className="cm-btn" onClick={() => { setAddingTag(false); setNewTagName('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="cm-footer">
        <button className="cm-btn cm-btn--danger" onClick={deleteCard}>Delete card</button>
      </div>
    </Modal>
  )
}
