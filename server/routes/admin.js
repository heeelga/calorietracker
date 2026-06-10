const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

// All routes require auth + admin
router.use(requireAuth, requireAdmin)

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, height_cm, weight_kg, birth_year, gender, activity_level, goal, target_weight_kg, calorie_target, protein_target_g, carbs_target_g, fat_target_g, xp, level, streak_days, last_log_date, onboarding_done, is_admin, is_banned, created_at FROM profiles ORDER BY created_at ASC'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, is_banned FROM profiles WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' })

    const newBanned = !rows[0].is_banned
    await pool.query('UPDATE profiles SET is_banned = ? WHERE id = ?', [newBanned, req.params.id])
    res.json({ is_banned: newBanned })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// PUT /api/admin/users/:id/admin
router.put('/users/:id/admin', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Eigene Admin-Rechte können nicht entfernt werden' })
    }
    const [rows] = await pool.query('SELECT id, is_admin FROM profiles WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' })

    const newAdmin = !rows[0].is_admin
    await pool.query('UPDATE profiles SET is_admin = ? WHERE id = ?', [newAdmin, req.params.id])
    res.json({ is_admin: newAdmin })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// PUT /api/admin/users/:id/password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 4) return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen haben' })

    const password_hash = await bcrypt.hash(password, 10)
    const [result] = await pool.query('UPDATE profiles SET password_hash = ? WHERE id = ?', [password_hash, req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/admin/users
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, is_admin = false } = req.body
    if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' })

    const [existing] = await pool.query('SELECT id FROM profiles WHERE email = ?', [email])
    if (existing.length > 0) return res.status(409).json({ error: 'E-Mail bereits registriert' })

    const password_hash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO profiles (id, name, email, password_hash, xp, level, streak_days, onboarding_done, is_admin, is_banned, created_at)
       VALUES (?, ?, ?, ?, 0, 1, 0, FALSE, ?, FALSE, ?)`,
      [id, name || null, email, password_hash, is_admin ? 1 : 0, now]
    )

    const [rows] = await pool.query(
      'SELECT id, name, email, height_cm, weight_kg, birth_year, gender, activity_level, goal, target_weight_kg, calorie_target, protein_target_g, carbs_target_g, fat_target_g, xp, level, streak_days, last_log_date, onboarding_done, is_admin, is_banned, created_at FROM profiles WHERE id = ?',
      [id]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
