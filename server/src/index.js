import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { testConnection } from './db.js'
import router from './routes/index.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api', router)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

testConnection().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})
