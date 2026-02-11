import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'epitrello',
  password: process.env.DB_PASSWORD || 'epitrello',
  database: process.env.DB_NAME || 'epitrello',
  waitForConnections: true,
  connectionLimit: 10,
})

export async function testConnection() {
  try {
    const conn = await pool.getConnection()
    console.log('MySQL connected')
    conn.release()
  } catch (err) {
    console.error('MySQL connection failed:', err.message)
    process.exit(1)
  }
}
