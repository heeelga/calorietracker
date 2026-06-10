const express = require('express')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const ALLOWED_FIELDS = [
  'name', 'height_cm', 'weight_kg', 'birth_year', 'gender',
  'activity_level', 'goal', 'target_weight_kg', 'calorie_target',
  'protein_target_g', 'carbs_target_g', 'fat_target_g',
  'xp', 'level', 'streak_days', 'last_log_date', 'onboarding_done',
]

// GET /api/profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, height_cm, weight_kg, birth_year, gender, activity_level, goal, target_weight_kg, calorie_target, protein_target_g, carbs_target_g, fat_target_g, xp, level, streak_days, last_log_date, onboarding_done, is_admin, is_banned, created_at FROM profiles WHERE id = ?',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Profil nicht gefunden' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// PUT /api/profile
router.put('/', requireAuth, async (req, res) => {
  try {
    const updates = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in req.body) {
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' })

    const setClauses = Object.keys(updates).map(f => `${f} = ?`).join(', ')
    const values = [...Object.values(updates), req.user.id]

    await pool.query(`UPDATE profiles SET ${setClauses} WHERE id = ?`, values)

    const [rows] = await pool.query(
      'SELECT id, name, email, height_cm, weight_kg, birth_year, gender, activity_level, goal, target_weight_kg, calorie_target, protein_target_g, carbs_target_g, fat_target_g, xp, level, streak_days, last_log_date, onboarding_done, is_admin, is_banned, created_at FROM profiles WHERE id = ?',
      [req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
