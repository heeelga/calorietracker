const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/meals/shareable-users — MUST be before /:id routes
router.get('/shareable-users', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email FROM profiles WHERE id != ?',
      [req.user.id]
    )
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// GET /api/meals
router.get('/', requireAuth, async (req, res) => {
  try {
    // Own meals
    const [ownMeals] = await pool.query(
      'SELECT m.*, p.name AS owner_name FROM meals m JOIN profiles p ON p.id = m.user_id WHERE m.user_id = ? ORDER BY m.created_at DESC',
      [req.user.id]
    )

    // Shared meals (meals shared with the current user)
    const [sharedMeals] = await pool.query(
      `SELECT m.*, p.name AS owner_name FROM meals m
       JOIN meal_shares ms ON ms.meal_id = m.id
       JOIN profiles p ON p.id = m.user_id
       WHERE ms.shared_with_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.id]
    )

    const allMeals = [
      ...ownMeals.map(m => ({ ...m, is_shared_with_me: false })),
      ...sharedMeals.map(m => ({ ...m, is_shared_with_me: true })),
    ]

    if (allMeals.length === 0) return res.json([])

    const mealIds = allMeals.map(m => m.id)
    const [ingredients] = await pool.query(
      `SELECT * FROM meal_ingredients WHERE meal_id IN (${mealIds.map(() => '?').join(',')})`,
      mealIds
    )

    // Load shares for own meals
    const ownMealIds = ownMeals.map(m => m.id)
    let sharesMap = {}
    if (ownMealIds.length > 0) {
      const [shareRows] = await pool.query(
        `SELECT ms.meal_id, p.id, p.name, p.email
         FROM meal_shares ms
         JOIN profiles p ON p.id = ms.shared_with_id
         WHERE ms.meal_id IN (${ownMealIds.map(() => '?').join(',')})`,
        ownMealIds
      )
      for (const row of shareRows) {
        if (!sharesMap[row.meal_id]) sharesMap[row.meal_id] = []
        sharesMap[row.meal_id].push({ id: row.id, name: row.name, email: row.email })
      }
    }

    const result = allMeals.map(meal => ({
      ...meal,
      ingredients: ingredients.filter(i => i.meal_id === meal.id),
      shares: sharesMap[meal.id] || [],
    }))

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/meals
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, ingredients = [], total_calories, total_protein_g, total_carbs_g, total_fat_g, image_url } = req.body
    if (!name) return res.status(400).json({ error: 'Name erforderlich' })

    const mealId = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO meals (id, user_id, name, total_calories, total_protein_g, total_carbs_g, total_fat_g, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mealId, req.user.id, name, total_calories || 0, total_protein_g || 0, total_carbs_g || 0, total_fat_g || 0, image_url || null, now]
    )

    for (const ing of ingredients) {
      const ingId = uuidv4()
      await pool.query(
        `INSERT INTO meal_ingredients (id, meal_id, food_name, food_brand, food_id, amount_grams, portion_label,
          calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
          calories, protein_g, carbs_g, fat_g, fiber_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ingId, mealId, ing.food_name, ing.food_brand || null, ing.food_id || null,
         ing.amount_grams, ing.portion_label || null,
         ing.calories_per_100g || 0, ing.protein_per_100g || 0, ing.carbs_per_100g || 0,
         ing.fat_per_100g || 0, ing.fiber_per_100g || 0,
         ing.calories || 0, ing.protein_g || 0, ing.carbs_g || 0, ing.fat_g || 0, ing.fiber_g || 0]
      )
    }

    const [mealRows] = await pool.query('SELECT * FROM meals WHERE id = ?', [mealId])
    const [ingRows] = await pool.query('SELECT * FROM meal_ingredients WHERE meal_id = ?', [mealId])

    res.status(201).json({ ...mealRows[0], ingredients: ingRows, shares: [], is_shared_with_me: false })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// POST /api/meals/:id/share
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { user_ids = [] } = req.body

    // Only owner can share
    const [mealRows] = await pool.query('SELECT * FROM meals WHERE id = ? AND user_id = ?', [id, req.user.id])
    if (mealRows.length === 0) return res.status(403).json({ error: 'Kein Zugriff' })

    for (const userId of user_ids) {
      const shareId = uuidv4()
      await pool.query(
        'INSERT IGNORE INTO meal_shares (id, meal_id, owner_id, shared_with_id) VALUES (?, ?, ?, ?)',
        [shareId, id, req.user.id, userId]
      )
    }

    // Return updated share list
    const [shareRows] = await pool.query(
      `SELECT p.id, p.name, p.email FROM meal_shares ms
       JOIN profiles p ON p.id = ms.shared_with_id
       WHERE ms.meal_id = ?`,
      [id]
    )
    res.json(shareRows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// DELETE /api/meals/:id/share/:userId
router.delete('/:id/share/:userId', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params

    // Only owner can unshare
    const [mealRows] = await pool.query('SELECT * FROM meals WHERE id = ? AND user_id = ?', [id, req.user.id])
    if (mealRows.length === 0) return res.status(403).json({ error: 'Kein Zugriff' })

    await pool.query(
      'DELETE FROM meal_shares WHERE meal_id = ? AND shared_with_id = ?',
      [id, userId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// DELETE /api/meals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM meal_ingredients WHERE meal_id = ?', [req.params.id])
    await pool.query('DELETE FROM meal_shares WHERE meal_id = ?', [req.params.id])
    const [result] = await pool.query(
      'DELETE FROM meals WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mahlzeit nicht gefunden' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

module.exports = router
