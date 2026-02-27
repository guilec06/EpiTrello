import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = header.slice(7)
  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, username FROM users WHERE id = ?',
      [payload.sub],
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' })
    }
    req.user = rows[0]
    next()
  } catch (err) {
    next(err)
  }
}
