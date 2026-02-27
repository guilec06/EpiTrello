import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'

const SALT_ROUNDS = 10

const users = [
  { email: 'alice@example.com', username: 'alice', password: 'password123' },
  { email: 'bob@example.com',   username: 'bob',   password: 'password123' },
  { email: 'carol@example.com', username: 'carol', password: 'password123' },
]

// [ownerIndex, title, visibility]
const boards = [
  [0, 'Project Alpha',      'private'],
  [1, 'Marketing Campaign', 'public'],
  [0, 'Personal Tasks',     'private'],
]

// board_members[boardIndex] = [{ userIndex, role }]
const boardMembers = [
  [{ userIndex: 1, role: 'editor' }], // Bob is editor on Project Alpha
  [],
  [],
]

// tags[boardIndex] = [{ name, color }]
const tags = [
  [{ name: 'Feature', color: '#0052cc' }, { name: 'Bug', color: '#eb5a46' }, { name: 'Review', color: '#f2a600' }],
  [{ name: 'Social',  color: '#61bd4f' }, { name: 'Content', color: '#c377e0' }],
  [{ name: 'Urgent',  color: '#eb5a46' }, { name: 'Personal', color: '#0079bf' }],
]

// lists[boardIndex] = [title, ...]
const lists = [
  ['Backlog', 'In Progress', 'Review', 'Done'],
  ['Ideas', 'Planning', 'Execution'],
  ['To Do', 'In Progress', 'Done'],
]

// cards[boardIndex][listIndex] = [{ title, description, tagIndices }]
const cards = [
  [
    [
      { title: 'Set up project repository',   description: 'Initialize git, add README, configure CI/CD pipeline', tagIndices: [0] },
      { title: 'Design database schema',       description: 'Design tables for users, boards, lists and cards',      tagIndices: [0] },
      { title: 'Write API specification',      description: 'Document all REST endpoints with OpenAPI 3.0',          tagIndices: [2] },
    ],
    [
      { title: 'Implement authentication',     description: 'JWT-based auth with register and login endpoints',      tagIndices: [0] },
      { title: 'Build board CRUD endpoints',   description: 'GET, POST, PUT, DELETE for boards resource',            tagIndices: [1] },
    ],
    [
      { title: 'Code review: auth module',     description: 'Peer review of authentication implementation',          tagIndices: [2] },
    ],
    [
      { title: 'Project kickoff meeting',      description: 'Align on goals, timeline and deliverables',             tagIndices: [] },
      { title: 'Docker environment setup',     description: 'Docker Compose for dev and prod environments',          tagIndices: [] },
    ],
  ],
  [
    [
      { title: 'Brainstorm campaign theme',    description: 'Generate ideas for Q2 marketing campaign',              tagIndices: [0] },
      { title: 'Define target audience',       description: 'Research and document buyer personas',                  tagIndices: [1] },
    ],
    [
      { title: 'Create content calendar',      description: 'Schedule posts across all channels for the quarter',    tagIndices: [1] },
      { title: 'Write blog post drafts',       description: '3 articles covering key product features',              tagIndices: [1] },
    ],
    [
      { title: 'Launch social media ads',      description: 'Facebook and Instagram ad campaigns with A/B tests',    tagIndices: [0] },
      { title: 'Send monthly newsletter',      description: 'Newsletter to 5k subscriber list',                      tagIndices: [0] },
    ],
  ],
  [
    [
      { title: 'Read TypeScript handbook',     description: null,                                                     tagIndices: [1] },
      { title: 'Set up exercise routine',      description: 'Morning jog 3x per week, track with Strava',            tagIndices: [1] },
    ],
    [
      { title: 'Learn Docker networking',      description: 'Study bridge, host and overlay network drivers',         tagIndices: [0] },
    ],
    [
      { title: 'Complete React advanced course', description: 'Finish patterns and performance modules',              tagIndices: [] },
      { title: 'Update portfolio site',        description: 'Add 3 recent projects with screenshots and live links',  tagIndices: [] },
    ],
  ],
]

async function seed() {
  console.log('Seeding database...')

  await pool.query('SET FOREIGN_KEY_CHECKS = 0')
  await pool.query('TRUNCATE TABLE card_tags')
  await pool.query('TRUNCATE TABLE tags')
  await pool.query('TRUNCATE TABLE board_members')
  await pool.query('TRUNCATE TABLE cards')
  await pool.query('TRUNCATE TABLE lists')
  await pool.query('TRUNCATE TABLE boards')
  await pool.query('TRUNCATE TABLE users')
  await pool.query('SET FOREIGN_KEY_CHECKS = 1')

  // Users
  const userIds = []
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS)
    const [r] = await pool.query(
      'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
      [u.email, u.username, hash],
    )
    userIds.push(r.insertId)
    console.log(`  user: ${u.email}`)
  }

  // Boards
  const boardIds = []
  for (const [ownerIdx, title, visibility] of boards) {
    const [r] = await pool.query(
      'INSERT INTO boards (title, owner_id, visibility) VALUES (?, ?, ?)',
      [title, userIds[ownerIdx], visibility],
    )
    boardIds.push(r.insertId)
    console.log(`  board: ${title} (${visibility})`)
  }

  // Board members
  for (let bi = 0; bi < boardMembers.length; bi++) {
    for (const { userIndex, role } of boardMembers[bi]) {
      await pool.query(
        'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
        [boardIds[bi], userIds[userIndex], role],
      )
      console.log(`    member: ${users[userIndex].email} → ${boards[bi][1]} as ${role}`)
    }
  }

  // Tags per board
  const tagIds = [] // tagIds[boardIndex][tagIndex]
  for (let bi = 0; bi < tags.length; bi++) {
    tagIds.push([])
    for (const { name, color } of tags[bi]) {
      const [r] = await pool.query(
        'INSERT INTO tags (board_id, name, color) VALUES (?, ?, ?)',
        [boardIds[bi], name, color],
      )
      tagIds[bi].push(r.insertId)
      console.log(`    tag: ${name} (${color})`)
    }
  }

  // Lists and cards
  for (let bi = 0; bi < boards.length; bi++) {
    for (let li = 0; li < lists[bi].length; li++) {
      const [r] = await pool.query(
        'INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)',
        [boardIds[bi], lists[bi][li], li],
      )
      const listId = r.insertId
      console.log(`    list: ${lists[bi][li]}`)

      const listCards = cards[bi]?.[li] ?? []
      for (let ci = 0; ci < listCards.length; ci++) {
        const { title, description, tagIndices } = listCards[ci]
        const [cr] = await pool.query(
          'INSERT INTO cards (list_id, title, description, position) VALUES (?, ?, ?, ?)',
          [listId, title, description, ci],
        )
        const cardId = cr.insertId
        console.log(`      card: ${title}`)

        for (const ti of tagIndices) {
          const tagId = tagIds[bi][ti]
          if (tagId) {
            await pool.query(
              'INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)',
              [cardId, tagId],
            )
          }
        }
      }
    }
  }

  console.log('\nSeed complete.')
  console.log('Credentials: alice@example.com / password123')
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
