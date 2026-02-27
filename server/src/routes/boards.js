import { Router } from 'express'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { getBoardRole, canEdit } from '../lib/boardAccess.js'

const router = Router()
router.use(authenticate)

// ── Board CRUD ────────────────────────────────────────────────────────────────

// GET /api/boards  — boards owned by or where user is a member
router.get('/', async (req, res, next) => {
  try {
    const [boards] = await pool.query(
      `SELECT DISTINCT b.id, b.title, b.visibility, b.created_at,
              (SELECT COUNT(*) FROM board_members bm WHERE bm.board_id = b.id) AS member_count,
              CASE WHEN b.owner_id = ? THEN 'owner' ELSE bm2.role END AS role
       FROM boards b
       LEFT JOIN board_members bm2 ON bm2.board_id = b.id AND bm2.user_id = ?
       WHERE b.owner_id = ? OR bm2.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id],
    )
    res.json(boards)
  } catch (err) {
    next(err)
  }
})

// POST /api/boards
router.post('/', async (req, res, next) => {
  try {
    const { title, visibility = 'private' } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })

    const [result] = await pool.query(
      'INSERT INTO boards (title, owner_id, visibility) VALUES (?, ?, ?)',
      [title, req.user.id, visibility],
    )
    res.status(201).json({ id: result.insertId, title, visibility, owner_id: req.user.id, role: 'owner' })
  } catch (err) {
    next(err)
  }
})

// GET /api/boards/:id  — full board with lists, cards (with tags), board tags, members
router.get('/:id', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (!role) return res.status(404).json({ error: 'Board not found' })

    const [boards] = await pool.query(
      'SELECT id, title, owner_id, visibility, created_at FROM boards WHERE id = ?',
      [req.params.id],
    )

    const [lists] = await pool.query(
      'SELECT id, title, position FROM lists WHERE board_id = ? ORDER BY position',
      [req.params.id],
    )

    // Cards with their tags (LEFT JOIN to include cards without tags)
    const [cardRows] = await pool.query(
      `SELECT c.id, c.list_id, c.title, c.description, c.position, c.created_at,
              t.id AS tag_id, t.name AS tag_name, t.color AS tag_color
       FROM cards c
       JOIN lists l ON c.list_id = l.id
       LEFT JOIN card_tags ct ON ct.card_id = c.id
       LEFT JOIN tags t ON t.id = ct.tag_id
       WHERE l.board_id = ?
       ORDER BY c.list_id, c.position, t.id`,
      [req.params.id],
    )

    // Aggregate tags per card
    const cardsMap = new Map()
    for (const row of cardRows) {
      if (!cardsMap.has(row.id)) {
        cardsMap.set(row.id, {
          id: row.id, list_id: row.list_id, title: row.title,
          description: row.description, position: row.position,
          created_at: row.created_at, tags: [],
        })
      }
      if (row.tag_id) {
        cardsMap.get(row.id).tags.push({ id: row.tag_id, name: row.tag_name, color: row.tag_color })
      }
    }

    const [boardTags] = await pool.query(
      'SELECT id, name, color FROM tags WHERE board_id = ? ORDER BY id',
      [req.params.id],
    )

    const [members] = await pool.query(
      `SELECT u.id, u.username, u.email, bm.role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.board_id = ?`,
      [req.params.id],
    )

    const board = { ...boards[0], role }
    board.lists = lists.map((list) => ({
      ...list,
      cards: [...cardsMap.values()].filter((c) => c.list_id === list.id),
    }))
    board.tags = boardTags
    board.members = members

    res.json(board)
  } catch (err) {
    next(err)
  }
})

// PUT /api/boards/:id  — owner or editor for title; only owner for visibility
router.put('/:id', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (!role || role === 'viewer') return res.status(403).json({ error: 'Access denied' })

    const { title, visibility } = req.body
    const updates = []
    const values = []
    if (title !== undefined) { updates.push('title = ?'); values.push(title) }
    if (visibility !== undefined && role === 'owner') { updates.push('visibility = ?'); values.push(visibility) }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    values.push(req.params.id)
    await pool.query(`UPDATE boards SET ${updates.join(', ')} WHERE id = ?`, values)
    res.json({ id: Number(req.params.id), title, visibility })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/boards/:id  — owner only
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM boards WHERE id = ? AND owner_id = ?',
      [req.params.id, req.user.id],
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Board not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// POST /api/boards/:boardId/lists
router.post('/:boardId/lists', async (req, res, next) => {
  try {
    if (!(await canEdit(req.params.boardId, req.user.id))) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { title, position } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })

    let pos = position
    if (pos === undefined) {
      const [[{ maxPos }]] = await pool.query(
        'SELECT COALESCE(MAX(position), -1) AS maxPos FROM lists WHERE board_id = ?',
        [req.params.boardId],
      )
      pos = maxPos + 1
    }

    const [result] = await pool.query(
      'INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)',
      [req.params.boardId, title, pos],
    )
    res.status(201).json({ id: result.insertId, board_id: Number(req.params.boardId), title, position: pos, cards: [] })
  } catch (err) {
    next(err)
  }
})

// ── Board Tags ────────────────────────────────────────────────────────────────

// GET /api/boards/:id/tags
router.get('/:id/tags', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (!role) return res.status(404).json({ error: 'Board not found' })

    const [tags] = await pool.query(
      'SELECT id, name, color FROM tags WHERE board_id = ? ORDER BY id',
      [req.params.id],
    )
    res.json(tags)
  } catch (err) {
    next(err)
  }
})

// POST /api/boards/:id/tags
router.post('/:id/tags', async (req, res, next) => {
  try {
    if (!(await canEdit(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { name, color = '#61bd4f' } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })

    const [result] = await pool.query(
      'INSERT INTO tags (board_id, name, color) VALUES (?, ?, ?)',
      [req.params.id, name, color],
    )
    res.status(201).json({ id: result.insertId, board_id: Number(req.params.id), name, color })
  } catch (err) {
    next(err)
  }
})

// ── Board Members ─────────────────────────────────────────────────────────────

// GET /api/boards/:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (!role) return res.status(404).json({ error: 'Board not found' })

    const [members] = await pool.query(
      `SELECT u.id, u.username, u.email, bm.role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.board_id = ?`,
      [req.params.id],
    )
    res.json(members)
  } catch (err) {
    next(err)
  }
})

// POST /api/boards/:id/members  — owner only, find user by email
router.post('/:id/members', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (role !== 'owner') return res.status(403).json({ error: 'Only the board owner can add members' })

    const { email, memberRole = 'viewer' } = req.body
    if (!email) return res.status(400).json({ error: 'email is required' })

    const [users] = await pool.query('SELECT id, username, email FROM users WHERE email = ?', [email])
    if (users.length === 0) return res.status(404).json({ error: 'User not found' })
    const target = users[0]

    if (target.id === req.user.id) return res.status(400).json({ error: 'You are already the owner' })

    await pool.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [req.params.id, target.id, memberRole],
    )
    res.status(201).json({ id: target.id, username: target.username, email: target.email, role: memberRole })
  } catch (err) {
    next(err)
  }
})

// PUT /api/boards/:id/members/:userId  — owner only
router.put('/:id/members/:userId', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (role !== 'owner') return res.status(403).json({ error: 'Only the board owner can change roles' })

    const { memberRole } = req.body
    if (!memberRole) return res.status(400).json({ error: 'memberRole is required' })

    const [result] = await pool.query(
      'UPDATE board_members SET role = ? WHERE board_id = ? AND user_id = ?',
      [memberRole, req.params.id, req.params.userId],
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Member not found' })
    res.json({ user_id: Number(req.params.userId), role: memberRole })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/boards/:id/members/:userId  — owner only
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const role = await getBoardRole(req.params.id, req.user.id)
    if (role !== 'owner') return res.status(403).json({ error: 'Only the board owner can remove members' })

    const [result] = await pool.query(
      'DELETE FROM board_members WHERE board_id = ? AND user_id = ?',
      [req.params.id, req.params.userId],
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Member not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
