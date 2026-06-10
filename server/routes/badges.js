const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/badges
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT badge_key FROM badges WHERE user_id = ?',
      [req.user.id]
    )
    res.json(rows.map(r => r.badge_key))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/badges
router.post('/', requireAuth, async (req, res) => {
  try {
    const { badge_key } = req.body
    if (!badge_key) return res.status(400).json({ error: 'badge_key erforderlich' })

    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      'INSERT IGNORE INTO badges (id, user_id, badge_key, earned_at) VALUES (?, ?, ?, ?)',
      [id, req.user.id, badge_key, now]
    )

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
