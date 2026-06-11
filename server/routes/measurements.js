const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/measurements?limit=10
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const [rows] = await pool.query(
      'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY log_date DESC, created_at DESC LIMIT ?',
      [req.user.id, limit]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/measurements
router.post('/', requireAuth, async (req, res) => {
  try {
    const { log_date, weight_kg, fat_pct, muscle_pct, visceral, note } = req.body
    if (!log_date) return res.status(400).json({ error: 'log_date erforderlich' })

    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO body_measurements (id, user_id, log_date, weight_kg, fat_pct, muscle_pct, visceral, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, log_date,
       weight_kg != null ? weight_kg : null,
       fat_pct != null ? fat_pct : null,
       muscle_pct != null ? muscle_pct : null,
       visceral != null ? visceral : null,
       note || null,
       now]
    )

    // Mirror weight into weight_log so analytics chart stays populated
    if (weight_kg != null) {
      await pool.query(
        `INSERT INTO weight_log (id, user_id, log_date, weight_kg, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)`,
        [uuidv4(), req.user.id, log_date, weight_kg,
         now]
      )
    }

    const [rows] = await pool.query('SELECT * FROM body_measurements WHERE id = ?', [id])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// DELETE /api/measurements/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM body_measurements WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Eintrag nicht gefunden' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
