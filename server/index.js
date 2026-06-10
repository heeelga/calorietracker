require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()

app.use(cors())
app.use(express.json())

// Routes
const authRouter = require('./routes/auth')
const profileRouter = require('./routes/profile')
const logRouter = require('./routes/log')
const mealsRouter = require('./routes/meals')
const weightRouter = require('./routes/weight')
const badgesRouter = require('./routes/badges')
const favoritesRouter = require('./routes/favorites')
const adminRouter = require('./routes/admin')

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/log', logRouter)
app.use('/api/meals', mealsRouter)
app.use('/api/weight', weightRouter)
app.use('/api/badges', badgesRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/admin', adminRouter)

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

async function initDB() {
  const pool = require('./db')
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (const stmt of statements) {
    await pool.query(stmt)
  }
  console.log('Database schema initialized')
}

const PORT = process.env.PORT || 3001

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  })
