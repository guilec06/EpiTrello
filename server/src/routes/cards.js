import { Router } from 'express'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Helper: verify user can edit the card's board (owner or editor member)
async function canEditCard(cardId, userId) {
  const [rows] = await pool.query(
    `SELECT c.id FROM cards c
     JOIN lists l ON c.list_id = l.id
     JOIN boards b ON l.board_id = b.id
     LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
     WHERE c.id = ? AND (b.owner_id = ? OR bm.role = 'editor')`,
    [userId, cardId, userId],
  )
  return rows.length > 0
}

// PUT /api/cards/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!(await canEditCard(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Card not found' })
    }

    const { title, description, position } = req.body
    const updates = []
    const values = []
    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description) }
    if (position !== undefined) { updates.push('position = ?'); values.push(position) }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    values.push(req.params.id)
    await pool.query(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`, values)
    res.json({ id: Number(req.params.id), title, description, position })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/cards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await canEditCard(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Card not found' })
    }
    await pool.query('DELETE FROM cards WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// PATCH /api/cards/:id/move  — move card to a different list (and/or position)
router.patch('/:id/move', async (req, res, next) => {
  try {
    if (!(await canEditCard(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Card not found' })
    }

    const { list_id, position } = req.body
    if (list_id === undefined) return res.status(400).json({ error: 'list_id is required' })

    // Verify target list is on a board the user can edit
    const [targetLists] = await pool.query(
      `SELECT l.id FROM lists l
       JOIN boards b ON l.board_id = b.id
       LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
       WHERE l.id = ? AND (b.owner_id = ? OR bm.role = 'editor')`,
      [req.user.id, list_id, req.user.id],
    )
    if (targetLists.length === 0) return res.status(404).json({ error: 'Target list not found' })

    let pos = position
    if (pos === undefined) {
      const [[{ maxPos }]] = await pool.query(
        'SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE list_id = ?',
        [list_id],
      )
      pos = maxPos + 1
    }

    await pool.query(
      'UPDATE cards SET list_id = ?, position = ? WHERE id = ?',
      [list_id, pos, req.params.id],
    )
    res.json({ id: Number(req.params.id), list_id: Number(list_id), position: pos })
  } catch (err) {
    next(err)
  }
})

// POST /api/cards/:id/tags/:tagId  — apply tag to card
router.post('/:id/tags/:tagId', async (req, res, next) => {
  try {
    if (!(await canEditCard(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Card not found' })
    }
    await pool.query(
      'INSERT IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)',
      [req.params.id, req.params.tagId],
    )
    res.status(201).json({ card_id: Number(req.params.id), tag_id: Number(req.params.tagId) })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/cards/:id/tags/:tagId  — remove tag from card
router.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    if (!(await canEditCard(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Card not found' })
    }
    await pool.query(
      'DELETE FROM card_tags WHERE card_id = ? AND tag_id = ?',
      [req.params.id, req.params.tagId],
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
