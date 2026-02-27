import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import CardModal from '../components/board/CardModal'
import MemberModal from '../components/board/MemberModal'
import './BoardPage.css'

// ── Tag badge ─────────────────────────────────────────────────────────────────

function TagBadge({ tag }) {
  return (
    <span className="tag-badge" style={{ background: tag.color }} title={tag.name} />
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function KanbanCard({ card, draggingCardId, onDragStart, onDragEnd, onClick }) {
  return (
    <div
      className={`bp-card${card.id === draggingCardId ? ' bp-card--dragging' : ''}`}
      draggable
      data-card-id={card.id}
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(card)}
    >
      {card.tags?.length > 0 && (
        <div className="bp-card-tags">
          {card.tags.map((t) => <TagBadge key={t.id} tag={t} />)}
        </div>
      )}
      <p className="bp-card-title">{card.title}</p>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({ col, cards, canEdit, dropTarget, draggingCardId, onDragStart, onDragOver, onDrop, onDragEnd, onCardClick, onDeleteColumn }) {
  const listRef = useRef(null)
  const isDropTarget = dropTarget?.colId === col.id
  const [addingCard, setAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [colTitle, setColTitle] = useState(col.title)

  function handleDragOver(e) {
    e.preventDefault()
    if (!listRef.current) return
    const cardEls = [...listRef.current.querySelectorAll('[data-card-id]')]
    let insertIndex = cardEls.length
    for (let i = 0; i < cardEls.length; i++) {
      const { top, height } = cardEls[i].getBoundingClientRect()
      if (e.clientY < top + height / 2) { insertIndex = i; break }
    }
    onDragOver(col.id, insertIndex)
  }

  async function addCard(e) {
    e.preventDefault()
    if (!newCardTitle.trim()) return
    try {
      const card = await api.post(`/lists/${col.id}/cards`, { title: newCardTitle.trim() })
      onDrop(col.id, null, card)   // use null to signal "new card"
      setNewCardTitle('')
      setAddingCard(false)
    } catch (err) {
      console.error(err)
    }
  }

  async function saveTitle() {
    if (colTitle === col.title) { setEditingTitle(false); return }
    try {
      await api.put(`/lists/${col.id}`, { title: colTitle })
      col.title = colTitle
    } catch {
      setColTitle(col.title)
    }
    setEditingTitle(false)
  }

  return (
    <div className="bp-column">
      <div className="bp-column-header">
        {editingTitle && canEdit ? (
          <input
            className="bp-column-title-input"
            value={colTitle}
            onChange={(e) => setColTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setColTitle(col.title); setEditingTitle(false) } }}
            autoFocus
          />
        ) : (
          <h3 className="bp-column-title" onClick={() => canEdit && setEditingTitle(true)}>
            {colTitle}
          </h3>
        )}
        <span className="bp-column-count">{cards.length}</span>
        {canEdit && (
          <button className="bp-column-delete" onClick={() => onDeleteColumn(col.id)} title="Delete column">✕</button>
        )}
      </div>

      <div
        ref={listRef}
        className={`bp-cards-list${isDropTarget ? ' drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDrop={(e) => { e.preventDefault(); onDrop(col.id) }}
      >
        {cards.map((card, index) => (
          <React.Fragment key={card.id}>
            {isDropTarget && dropTarget.index === index && <div className="bp-drop-placeholder" />}
            <KanbanCard
              card={card}
              draggingCardId={draggingCardId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onCardClick}
            />
          </React.Fragment>
        ))}
        {isDropTarget && dropTarget.index >= cards.length && <div className="bp-drop-placeholder" />}
        {cards.length === 0 && !isDropTarget && <p className="bp-empty-hint">Drop cards here</p>}
      </div>

      {canEdit && (
        addingCard ? (
          <form className="bp-add-card-form" onSubmit={addCard}>
            <textarea
              className="bp-add-card-input"
              placeholder="Card title…"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(e) } if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle('') } }}
              autoFocus
              rows={2}
            />
            <div className="bp-add-card-actions">
              <button className="bp-add-card-submit" type="submit">Add card</button>
              <button type="button" className="bp-add-card-cancel" onClick={() => { setAddingCard(false); setNewCardTitle('') }}>✕</button>
            </div>
          </form>
        ) : (
          <button className="bp-add-card-btn" onClick={() => setAddingCard(true)}>
            + Add a card
          </button>
        )
      )}
    </div>
  )
}

// ── Board Page ────────────────────────────────────────────────────────────────

export default function BoardPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [board, setBoard]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [dropTarget, setDropTarget]     = useState(null)
  const [draggingCardId, setDraggingCardId] = useState(null)
  const [activeCard, setActiveCard]     = useState(null)
  const [showMembers, setShowMembers]   = useState(false)
  const [addingCol, setAddingCol]       = useState(false)
  const [newColTitle, setNewColTitle]   = useState('')
  const [editingBoardTitle, setEditingBoardTitle] = useState(false)
  const [boardTitle, setBoardTitle]     = useState('')
  const dragging = useRef(null)

  const canEdit = board?.role === 'owner' || board?.role === 'editor'

  useEffect(() => {
    api.get(`/boards/${id}`)
      .then((b) => { setBoard(b); setBoardTitle(b.title) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function handleDragStart(e, cardId) {
    const sourceCol = board.lists.find((l) => l.cards.some((c) => c.id === cardId))
    dragging.current = { cardId, sourceColId: sourceCol?.id }
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => setDraggingCardId(cardId))
  }

  function handleColumnDragOver(colId, index) {
    setDropTarget((prev) =>
      prev?.colId === colId && prev?.index === index ? prev : { colId, index }
    )
  }

  function handleDrop(targetColId, _, newCard = null) {
    // New card added inline — just append to state
    if (newCard) {
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === targetColId ? { ...l, cards: [...l.cards, newCard] } : l
        ),
      }))
      return
    }

    if (!dragging.current || dropTarget == null) return
    const { cardId, sourceColId } = dragging.current
    const { index: rawIndex } = dropTarget

    setBoard((prev) => {
      const sourceList = prev.lists.find((l) => l.id === sourceColId)
      const targetList = prev.lists.find((l) => l.id === targetColId)
      const sourceCards = [...sourceList.cards]
      const sourceIdx = sourceCards.findIndex((c) => c.id === cardId)
      const [moved] = sourceCards.splice(sourceIdx, 1)

      const targetCards = sourceColId === targetColId
        ? sourceCards
        : [...targetList.cards]

      const insertIdx = (sourceColId === targetColId && sourceIdx < rawIndex)
        ? rawIndex - 1
        : rawIndex

      targetCards.splice(Math.max(0, Math.min(insertIdx, targetCards.length)), 0, moved)

      // Persist to API
      api.patch(`/cards/${cardId}/move`, { list_id: targetColId, position: insertIdx }).catch(console.error)

      return {
        ...prev,
        lists: prev.lists.map((l) => {
          if (l.id === sourceColId) return { ...l, cards: sourceCards }
          if (l.id === targetColId && sourceColId !== targetColId) return { ...l, cards: targetCards }
          return l
        }),
      }
    })

    dragging.current = null
    setDraggingCardId(null)
    setDropTarget(null)
  }

  function handleDragEnd() {
    dragging.current = null
    setDraggingCardId(null)
    setDropTarget(null)
  }

  // ── Card updates ─────────────────────────────────────────────────────────────

  function handleCardUpdated(updated) {
    const newTag = updated._newTag
    setBoard((prev) => {
      const next = {
        ...prev,
        lists: prev.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) => c.id === updated.id ? { ...updated } : c),
        })),
        tags: newTag && !prev.tags.some((t) => t.id === newTag.id)
          ? [...prev.tags, newTag]
          : prev.tags,
      }
      return next
    })
    setActiveCard({ ...updated })
  }

  function handleCardDeleted(cardId) {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => ({
        ...l,
        cards: l.cards.filter((c) => c.id !== cardId),
      })),
    }))
  }

  // ── Column management ────────────────────────────────────────────────────────

  async function addColumn(e) {
    e.preventDefault()
    if (!newColTitle.trim()) return
    try {
      const col = await api.post(`/boards/${id}/lists`, { title: newColTitle.trim() })
      setBoard((prev) => ({ ...prev, lists: [...prev.lists, col] }))
      setNewColTitle('')
      setAddingCol(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteColumn(colId) {
    if (!confirm('Delete this column and all its cards?')) return
    try {
      await api.delete(`/lists/${colId}`)
      setBoard((prev) => ({ ...prev, lists: prev.lists.filter((l) => l.id !== colId) }))
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Board title / visibility ──────────────────────────────────────────────────

  async function saveBoardTitle() {
    if (boardTitle === board.title) { setEditingBoardTitle(false); return }
    try {
      await api.put(`/boards/${id}`, { title: boardTitle })
      setBoard((prev) => ({ ...prev, title: boardTitle }))
    } catch {
      setBoardTitle(board.title)
    }
    setEditingBoardTitle(false)
  }

  async function toggleVisibility() {
    const next = board.visibility === 'private' ? 'public' : 'private'
    try {
      await api.put(`/boards/${id}`, { visibility: next })
      setBoard((prev) => ({ ...prev, visibility: next }))
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return <div className="bp-loading">Loading board…</div>
  if (error)   return <div className="bp-loading bp-error">{error}</div>
  if (!board)  return null

  return (
    <div className="bp-page">
      {/* Board bar */}
      <div className="bp-bar">
        {editingBoardTitle && canEdit ? (
          <input
            className="bp-bar-title-input"
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            onBlur={saveBoardTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveBoardTitle(); if (e.key === 'Escape') { setBoardTitle(board.title); setEditingBoardTitle(false) } }}
            autoFocus
          />
        ) : (
          <h1 className="bp-bar-title" onClick={() => canEdit && setEditingBoardTitle(true)}>
            {board.title}
          </h1>
        )}

        <div className="bp-bar-actions">
          <span className={`bp-vis-badge${board.visibility === 'public' ? ' bp-vis-badge--public' : ''}`}>
            {board.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
          </span>
          {board.role === 'owner' && (
            <button className="bp-bar-btn" onClick={toggleVisibility}>
              Make {board.visibility === 'private' ? 'public' : 'private'}
            </button>
          )}
          <button className="bp-bar-btn" onClick={() => setShowMembers(true)}>
            Members ({board.members.length})
          </button>
          <button className="bp-bar-btn bp-bar-btn--back" onClick={() => navigate('/boards')}>
            ← Boards
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="bp-columns">
        {board.lists.map((col) => (
          <Column
            key={col.id}
            col={col}
            cards={col.cards}
            canEdit={canEdit}
            dropTarget={dropTarget}
            draggingCardId={draggingCardId}
            onDragStart={handleDragStart}
            onDragOver={handleColumnDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onCardClick={setActiveCard}
            onDeleteColumn={deleteColumn}
          />
        ))}

        {/* Add column */}
        {canEdit && (
          <div className="bp-add-column">
            {addingCol ? (
              <form className="bp-add-column-form" onSubmit={addColumn}>
                <input
                  className="bp-add-column-input"
                  placeholder="Column title…"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  autoFocus
                />
                <div className="bp-add-column-actions">
                  <button className="bp-add-col-btn" type="submit">Add column</button>
                  <button type="button" className="bp-add-col-cancel" onClick={() => { setAddingCol(false); setNewColTitle('') }}>✕</button>
                </div>
              </form>
            ) : (
              <button className="bp-add-column-btn" onClick={() => setAddingCol(true)}>
                + Add a column
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card modal */}
      {activeCard && (
        <CardModal
          card={activeCard}
          boardTags={board.tags}
          boardId={id}
          onClose={() => setActiveCard(null)}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={handleCardDeleted}
        />
      )}

      {/* Member modal */}
      {showMembers && (
        <MemberModal
          boardId={id}
          members={board.members}
          currentUser={user}
          ownerId={board.owner_id}
          onClose={() => setShowMembers(false)}
          onMembersChanged={(members) => setBoard((prev) => ({ ...prev, members }))}
        />
      )}
    </div>
  )
}
