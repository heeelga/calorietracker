const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/favorites
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/favorites
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      food_name, food_brand, food_id, barcode,
      calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
      image_url, package_weight_g,
    } = req.body

    if (!food_name) return res.status(400).json({ error: 'food_name erforderlich' })

    // Check for duplicate food_id if provided
    if (food_id) {
      const [existing] = await pool.query(
        'SELECT id FROM favorites WHERE user_id = ? AND food_id = ?',
        [req.user.id, food_id]
      )
      if (existing.length > 0) return res.json(existing[0])
    }

    const id = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO favorites (id, user_id, food_name, food_brand, food_id, barcode,
        calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
        image_url, package_weight_g, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, food_name, food_brand || null, food_id || null, barcode || null,
       calories_per_100g || 0, protein_per_100g || 0, carbs_per_100g || 0, fat_per_100g || 0, fiber_per_100g || 0,
       image_url || null, package_weight_g || null, now]
    )

    const [rows] = await pool.query('SELECT * FROM favorites WHERE id = ?', [id])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// PUT /api/favorites/:id/pin — toggle is_favorite
router.put('/:id/pin', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, is_favorite FROM favorites WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Favorit nicht gefunden' })
    const newVal = rows[0].is_favorite ? 0 : 1
    await pool.query('UPDATE favorites SET is_favorite = ? WHERE id = ?', [newVal, req.params.id])
    res.json({ is_favorite: !!newVal })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// DELETE /api/favorites/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM favorites WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Favorit nicht gefunden' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
