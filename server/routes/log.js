const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/log?date=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date parameter required' })

    const [rows] = await pool.query(
      'SELECT * FROM log_entries WHERE user_id = ? AND log_date = ? ORDER BY created_at ASC',
      [req.user.id, date]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// GET /api/log/week?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/week', requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query
    if (!start || !end) return res.status(400).json({ error: 'start and end required' })

    const [rows] = await pool.query(
      'SELECT * FROM log_entries WHERE user_id = ? AND log_date >= ? AND log_date <= ? ORDER BY log_date ASC, created_at ASC',
      [req.user.id, start, end]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// GET /api/log/count
router.get('/count', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM log_entries WHERE user_id = ?',
      [req.user.id]
    )
    res.json({ count: rows[0].cnt })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/log
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      log_date, meal_type, food_id, food_name, food_brand,
      amount_grams, portion_label, calories, protein_g, carbs_g, fat_g, fiber_g,
    } = req.body

    if (!log_date || !meal_type || !food_name || amount_grams == null) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen' })
    }

    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO log_entries (id, user_id, log_date, meal_type, food_id, food_name, food_brand, amount_grams, portion_label, calories, protein_g, carbs_g, fat_g, fiber_g, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, log_date, meal_type, food_id || null, food_name, food_brand || null,
       amount_grams, portion_label || null, calories || 0, protein_g || 0, carbs_g || 0, fat_g || 0, fiber_g || 0, now]
    )

    const [rows] = await pool.query('SELECT * FROM log_entries WHERE id = ?', [id])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// DELETE /api/log/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM log_entries WHERE id = ? AND user_id = ?',
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
