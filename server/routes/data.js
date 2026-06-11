const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/data/export
router.get('/export', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    const [[profile]] = await pool.query('SELECT * FROM profiles WHERE id = ?', [userId])
    const [logEntries] = await pool.query('SELECT * FROM log_entries WHERE user_id = ? ORDER BY log_date, created_at', [userId])
    const [weightLog] = await pool.query('SELECT * FROM weight_log WHERE user_id = ? ORDER BY log_date', [userId])
    const [meals] = await pool.query('SELECT * FROM meals WHERE user_id = ? ORDER BY created_at', [userId])
    const mealIds = meals.map(m => m.id)
    const ingredients = mealIds.length
      ? (await pool.query('SELECT * FROM meal_ingredients WHERE meal_id IN (?)', [mealIds]))[0]
      : []
    const [favorites] = await pool.query('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at', [userId])
    const [badges] = await pool.query('SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at', [userId])

    const { password_hash, ...safeProfile } = profile || {}

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      profile: safeProfile,
      log_entries: logEntries,
      weight_log: weightLog,
      meals,
      meal_ingredients: ingredients,
      favorites,
      badges,
    }

    const filename = `kaltracker-export-${new Date().toISOString().slice(0, 10)}.json`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(exportData)
  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: 'Export fehlgeschlagen' })
  }
})

// POST /api/data/import
router.post('/import', requireAuth, async (req, res) => {
  const userId = req.user.id
  const { version, log_entries, weight_log, meals, meal_ingredients, favorites, badges } = req.body

  if (!version) return res.status(400).json({ error: 'Ungültiges Import-Format' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    let imported = { log_entries: 0, weight_log: 0, meals: 0, favorites: 0, badges: 0 }

    // Log entries
    for (const e of (log_entries || [])) {
      await conn.query(
        `INSERT IGNORE INTO log_entries
          (id, user_id, log_date, meal_type, food_id, food_name, food_brand,
           amount_grams, portion_label, calories, protein_g, carbs_g, fat_g, fiber_g, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id || uuidv4(), userId, e.log_date, e.meal_type, e.food_id || null,
         e.food_name, e.food_brand || null, e.amount_grams, e.portion_label || null,
         e.calories || 0, e.protein_g || 0, e.carbs_g || 0, e.fat_g || 0, e.fiber_g || 0,
         e.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')]
      ).then(([r]) => { if (r.affectedRows > 0) imported.log_entries++ })
    }

    // Weight log
    for (const w of (weight_log || [])) {
      await conn.query(
        `INSERT IGNORE INTO weight_log (id, user_id, log_date, weight_kg, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [w.id || uuidv4(), userId, w.log_date, w.weight_kg,
         w.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')]
      ).then(([r]) => { if (r.affectedRows > 0) imported.weight_log++ })
    }

    // Meals
    const mealIdMap = {}
    for (const m of (meals || [])) {
      const newId = m.id || uuidv4()
      mealIdMap[m.id] = newId
      await conn.query(
        `INSERT IGNORE INTO meals
          (id, user_id, name, total_calories, total_protein_g, total_carbs_g, total_fat_g, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, userId, m.name, m.total_calories || 0, m.total_protein_g || 0,
         m.total_carbs_g || 0, m.total_fat_g || 0,
         m.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')]
      ).then(([r]) => { if (r.affectedRows > 0) imported.meals++ })
    }

    // Meal ingredients (re-keyed to imported meal IDs)
    for (const i of (meal_ingredients || [])) {
      const targetMealId = mealIdMap[i.meal_id] || i.meal_id
      await conn.query(
        `INSERT IGNORE INTO meal_ingredients
          (id, meal_id, food_name, food_brand, food_id, amount_grams, portion_label,
           calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
           calories, protein_g, carbs_g, fat_g, fiber_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id || uuidv4(), targetMealId, i.food_name, i.food_brand || null, i.food_id || null,
         i.amount_grams, i.portion_label || null,
         i.calories_per_100g || 0, i.protein_per_100g || 0, i.carbs_per_100g || 0,
         i.fat_per_100g || 0, i.fiber_per_100g || 0,
         i.calories || 0, i.protein_g || 0, i.carbs_g || 0, i.fat_g || 0, i.fiber_g || 0]
      )
    }

    // Favorites
    for (const f of (favorites || [])) {
      await conn.query(
        `INSERT IGNORE INTO favorites
          (id, user_id, food_name, food_brand, food_id, barcode,
           calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
           image_url, package_weight_g, is_favorite, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.id || uuidv4(), userId, f.food_name, f.food_brand || null, f.food_id || null,
         f.barcode || null, f.calories_per_100g || 0, f.protein_per_100g || 0,
         f.carbs_per_100g || 0, f.fat_per_100g || 0, f.fiber_per_100g || 0,
         f.image_url || null, f.package_weight_g || null, f.is_favorite ? 1 : 0,
         f.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')]
      ).then(([r]) => { if (r.affectedRows > 0) imported.favorites++ })
    }

    // Badges
    for (const b of (badges || [])) {
      await conn.query(
        `INSERT IGNORE INTO badges (id, user_id, badge_key, earned_at) VALUES (?, ?, ?, ?)`,
        [b.id || uuidv4(), userId, b.badge_key,
         b.earned_at || new Date().toISOString().slice(0, 19).replace('T', ' ')]
      ).then(([r]) => { if (r.affectedRows > 0) imported.badges++ })
    }

    await conn.commit()
    res.json({ success: true, imported })
  } catch (err) {
    await conn.rollback()
    console.error('Import error:', err)
    res.status(500).json({ error: 'Import fehlgeschlagen: ' + err.message })
  } finally {
    conn.release()
  }
})

module.exports = router
