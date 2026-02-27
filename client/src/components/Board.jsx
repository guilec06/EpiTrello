import React, { useState, useRef } from 'react'
import './Board.css'

const INITIAL_DATA = {
  columnOrder: ['col-1', 'col-2', 'col-3'],
  columns: {
    'col-1': { id: 'col-1', title: 'To Do',       cardIds: ['c1', 'c2', 'c3'] },
    'col-2': { id: 'col-2', title: 'In Progress',  cardIds: ['c4'] },
    'col-3': { id: 'col-3', title: 'Done',         cardIds: ['c5', 'c6'] },
  },
  cards: {
    c1: { id: 'c1', title: 'Set up project structure',  label: 'Setup' },
    c2: { id: 'c2', title: 'Design database schema',    label: 'Backend' },
    c3: { id: 'c3', title: 'Create login page',         label: 'Frontend' },
    c4: { id: 'c4', title: 'Implement authentication',  label: 'Backend' },
    c5: { id: 'c5', title: 'Initialise Git repository', label: 'Setup' },
    c6: { id: 'c6', title: 'Write project README',      label: 'Docs' },
  },
}

const LABEL_COLORS = {
  Setup:    '#5aac44',
  Backend:  '#0079bf',
  Frontend: '#e07b00',
  Docs:     '#c0392b',
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({ column, cards, dropTarget, draggingCardId, onDragStart, onColumnDragOver, onDrop, onDragEnd }) {
  const listRef = useRef(null)
  const isDropTarget = dropTarget?.colId === column.id

  function handleDragOver(e) {
    e.preventDefault()
    if (!listRef.current) return

    // Walk visible card elements (includes the dragging one, still in DOM)
    const cardEls = [...listRef.current.querySelectorAll('[data-card-id]')]
    let insertIndex = cardEls.length
    for (let i = 0; i < cardEls.length; i++) {
      const { top, height } = cardEls[i].getBoundingClientRect()
      if (e.clientY < top + height / 2) {
        insertIndex = i
        break
      }
    }
    onColumnDragOver(column.id, insertIndex)
  }

  return (
    <div className="column">
      <div className="column-header">
        <h3>{column.title}</h3>
        <span className="card-count">{cards.length}</span>
      </div>
      <div
        ref={listRef}
        className={`cards-list${isDropTarget ? ' drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDrop={(e) => { e.preventDefault(); onDrop(column.id) }}
      >
        {cards.map((card, index) => (
          <React.Fragment key={card.id}>
            {isDropTarget && dropTarget.index === index && (
              <div className="drop-placeholder" />
            )}
            <div
              className={`card${card.id === draggingCardId ? ' card--dragging' : ''}`}
              draggable
              data-card-id={card.id}
              onDragStart={(e) => onDragStart(e, card.id)}
              onDragEnd={onDragEnd}
            >
              <span
                className="card-label"
                style={{ backgroundColor: LABEL_COLORS[card.label] ?? '#888' }}
              >
                {card.label}
              </span>
              <p className="card-title">{card.title}</p>
            </div>
          </React.Fragment>
        ))}

        {/* Placeholder at the end of the list */}
        {isDropTarget && dropTarget.index >= cards.length && (
          <div className="drop-placeholder" />
        )}

        {/* Hint when column is empty and not being targeted */}
        {cards.length === 0 && !isDropTarget && (
          <p className="empty-hint">Drop cards here</p>
        )}
      </div>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────

export default function Board() {
  const [data, setData]               = useState(INITIAL_DATA)
  const [dropTarget, setDropTarget]   = useState(null)   // { colId, index }
  const [draggingCardId, setDraggingCardId] = useState(null)
  const dragging = useRef(null)                           // { cardId, sourceColId }

  function handleDragStart(e, cardId) {
    const sourceColId = data.columnOrder.find(colId =>
      data.columns[colId].cardIds.includes(cardId)
    )
    dragging.current = { cardId, sourceColId }
    e.dataTransfer.effectAllowed = 'move'
    // Delay the opacity change so the drag image is captured first
    requestAnimationFrame(() => setDraggingCardId(cardId))
  }

  function handleColumnDragOver(colId, index) {
    setDropTarget(prev =>
      prev?.colId === colId && prev?.index === index ? prev : { colId, index }
    )
  }

  function handleDrop(targetColId) {
    if (!dragging.current || dropTarget == null) return

    const { cardId, sourceColId } = dragging.current
    const { index: rawIndex } = dropTarget

    setData(prev => {
      const sourceIds = [...prev.columns[sourceColId].cardIds]
      const sourceIdx = sourceIds.indexOf(cardId)
      sourceIds.splice(sourceIdx, 1)

      // For same-column moves reuse the already-mutated sourceIds array
      const targetIds = sourceColId === targetColId
        ? sourceIds
        : [...prev.columns[targetColId].cardIds]

      // When moving down within the same column the removal shifts indices by -1
      const insertIdx = (sourceColId === targetColId && sourceIdx < rawIndex)
        ? rawIndex - 1
        : rawIndex

      targetIds.splice(Math.max(0, Math.min(insertIdx, targetIds.length)), 0, cardId)

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [sourceColId]: { ...prev.columns[sourceColId], cardIds: sourceIds },
          [targetColId]: { ...prev.columns[targetColId], cardIds: targetIds },
        },
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

  return (
    <div className="board">
      <div className="board-header">
        <span className="board-title">EpiTrello</span>
      </div>
      <div className="board-columns">
        {data.columnOrder.map(colId => {
          const column = data.columns[colId]
          const cards  = column.cardIds.map(id => data.cards[id])
          return (
            <Column
              key={colId}
              column={column}
              cards={cards}
              dropTarget={dropTarget}
              draggingCardId={draggingCardId}
              onDragStart={handleDragStart}
              onColumnDragOver={handleColumnDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          )
        })}
      </div>
    </div>
  )
}