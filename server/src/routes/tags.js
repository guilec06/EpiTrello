import { Router } from 'express'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { canEdit } from '../lib/boardAccess.js'

const router = Router()
router.use(authenticate)

// Helper: get the board_id for a tag and verify edit access
async function canEditTag(tagId, userId) {
  const [rows] = await pool.query('SELECT board_id FROM tags WHERE id = ?', [tagId])
  if (rows.length === 0) return false
  return canEdit(rows[0].board_id, userId)
}

// PUT /api/tags/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!(await canEditTag(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    const { name, color } = req.body
    const updates = []
    const values = []
    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (color !== undefined) { updates.push('color = ?'); values.push(color) }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    values.push(req.params.id)
    await pool.query(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`, values)
    res.json({ id: Number(req.params.id), name, color })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/tags/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await canEditTag(req.params.id, req.user.id))) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    await pool.query('DELETE FROM tags WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
