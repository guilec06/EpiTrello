import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// PUT /api/users/me  — update username or password
router.put('/me', async (req, res, next) => {
  try {
    const { username, currentPassword, newPassword } = req.body
    const updates = []
    const values = []

    if (username !== undefined) {
      updates.push('username = ?')
      values.push(username)
    }

    if (newPassword !== undefined) {
      if (!currentPassword) return res.status(400).json({ error: 'currentPassword is required to change password' })
      const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id])
      const valid = await bcrypt.compare(currentPassword, rows[0].password)
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
      updates.push('password = ?')
      values.push(await bcrypt.hash(newPassword, 10))
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    values.push(req.user.id)
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)

    const [rows] = await pool.query('SELECT id, email, username FROM users WHERE id = ?', [req.user.id])
    res.json({ user: rows[0] })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/users/me  — delete account (requires password confirmation)
router.delete('/me', async (req, res, next) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'password is required' })

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id])
    const valid = await bcrypt.compare(password, rows[0].password)
    if (!valid) return res.status(401).json({ error: 'Incorrect password' })

    await pool.query('DELETE FROM users WHERE id = ?', [req.user.id])
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
