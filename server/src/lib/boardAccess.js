import { pool } from '../db.js'

/**
 * Returns the current user's role on a board:
 *   'owner'  – the board owner
 *   'editor' – a board_member with role='editor'
 *   'viewer' – a board_member with role='viewer', or any authenticated user on a public board
 *   null     – no access
 */
export async function getBoardRole(boardId, userId) {
  const [rows] = await pool.query(
    `SELECT
       CASE
         WHEN b.owner_id = ?        THEN 'owner'
         WHEN bm.role IS NOT NULL   THEN bm.role
         WHEN b.visibility = 'public' THEN 'viewer'
         ELSE NULL
       END AS role
     FROM boards b
     LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
     WHERE b.id = ?`,
    [userId, userId, boardId],
  )
  return rows[0]?.role ?? null
}

/** Returns true if the user can create/edit/delete lists and cards on this board. */
export async function canEdit(boardId, userId) {
  const role = await getBoardRole(boardId, userId)
  return role === 'owner' || role === 'editor'
}
