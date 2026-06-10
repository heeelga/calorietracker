const express = require('express')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/meals
router.get('/', requireAuth, async (req, res) => {
  try {
    const [meals] = await pool.query(
      'SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    )

    if (meals.length === 0) return res.json([])

    const mealIds = meals.map(m => m.id)
    const [ingredients] = await pool.query(
      `SELECT * FROM meal_ingredients WHERE meal_id IN (${mealIds.map(() => '?').join(',')})`,
      mealIds
    )

    const result = meals.map(meal => ({
      ...meal,
      ingredients: ingredients.filter(i => i.meal_id === meal.id),
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
    const { name, ingredients = [], total_calories, total_protein_g, total_carbs_g, total_fat_g } = req.body
    if (!name) return res.status(400).json({ error: 'Name erforderlich' })

    const mealId = uuidv4()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      `INSERT INTO meals (id, user_id, name, total_calories, total_protein_g, total_carbs_g, total_fat_g, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [mealId, req.user.id, name, total_calories || 0, total_protein_g || 0, total_carbs_g || 0, total_fat_g || 0, now]
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

    res.status(201).json({ ...mealRows[0], ingredients: ingRows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Serverfehler' })
  }
})

// DELETE /api/meals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM meal_ingredients WHERE meal_id = ?', [req.params.id])
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
