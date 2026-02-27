import { Router } from 'express'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Helper: verify user can edit the list's board (owner or editor member)
async function canEditList(listId, userId) {
  const [rows] = await pool.query(
    `SELECT l.id FROM lists l
     JOIN boards b ON l.board_id = b.id
     LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
     WHERE l.id = ? AND (b.owner_id = ? OR bm.role = 'editor')`,
    [userId, listId, userId],
  )
  return rows.length > 0
}

// PUT /api/lists/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!(await canEditList(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'List not found' })
    }

    const { title, position } = req.body
    const updates = []
    const values = []
    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (position !== undefined) { updates.push('position = ?'); values.push(position) }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    values.push(req.params.id)
    await pool.query(`UPDATE lists SET ${updates.join(', ')} WHERE id = ?`, values)
    res.json({ id: Number(req.params.id), title, position })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/lists/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await canEditList(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'List not found' })
    }
    await pool.query('DELETE FROM lists WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// POST /api/lists/:listId/cards
router.post('/:listId/cards', async (req, res, next) => {
  try {
    if (!(await canEditList(req.params.listId, req.user.id))) {
      return res.status(404).json({ error: 'List not found' })
    }

    const { title, description, position } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })

    let pos = position
    if (pos === undefined) {
      const [[{ maxPos }]] = await pool.query(
        'SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE list_id = ?',
        [req.params.listId],
      )
      pos = maxPos + 1
    }

    const [result] = await pool.query(
      'INSERT INTO cards (list_id, title, description, position) VALUES (?, ?, ?, ?)',
      [req.params.listId, title, description ?? null, pos],
    )
    res.status(201).json({
      id: result.insertId, list_id: Number(req.params.listId),
      title, description: description ?? null, position: pos, tags: [],
    })
  } catch (err) {
    next(err)
  }
})

export default router
