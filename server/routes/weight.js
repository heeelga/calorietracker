const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/weight
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM weight_log WHERE user_id = ? ORDER BY log_date ASC LIMIT 30',
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/weight (upsert)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { log_date, weight_kg } = req.body
    if (!log_date || weight_kg == null) return res.status(400).json({ error: 'log_date und weight_kg erforderlich' })

    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO weight_log (id, user_id, log_date, weight_kg, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
      [id, req.user.id, log_date, weight_kg, now]
    )

    const [rows] = await pool.query(
      'SELECT * FROM weight_log WHERE user_id = ? AND log_date = ?',
      [req.user.id, log_date]
    )
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
