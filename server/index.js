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
const dataRouter = require('./routes/data')
const measurementsRouter = require('./routes/measurements')

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/log', logRouter)
app.use('/api/meals', mealsRouter)
app.use('/api/weight', weightRouter)
app.use('/api/badges', badgesRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/admin', adminRouter)
app.use('/api/data', dataRouter)
app.use('/api/measurements', measurementsRouter)

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  if (fs.existsSync(distPath)) {
    // No-cache headers for SW + HTML so updates are picked up immediately
    app.use((req, res, next) => {
      if (req.path === '/sw.js' || req.path.match(/workbox-.*\.js$/)) {
        res.setHeader('Cache-Control', 'no-store')
      } else if (req.path === '/' || req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
      next()
    })
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
}

async function initDB() {
  const pool = require('./db')
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (const stmt of statements) {
    await pool.query(stmt)
  }
  // Migrations for existing databases
  try {
    await pool.query('ALTER TABLE favorites ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE')
  } catch (_) { /* column already exists */ }
  console.log('Datenbankschema initialisiert')
}

async function initDBWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await initDB()
      return
    } catch (err) {
      console.error(`DB-Verbindung fehlgeschlagen (Versuch ${attempt}/${maxRetries}): ${err.message}`)
      if (attempt === maxRetries) {
        console.error('Maximale Versuche erreicht. Server wird beendet.')
        process.exit(1)
      }
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

const PORT = process.env.PORT || 3001

// Start server immediately, init DB in background with retry
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`)
  initDBWithRetry().catch(() => process.exit(1))
})
