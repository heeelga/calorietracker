import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { LogEntry, MealType } from '../types'
import { calculateNutrition } from '../lib/nutrition'
import type { FoodItem } from '../types'

export function useDailyLog(userId: string | undefined, date: string) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await api.get(`/log?date=${date}`)
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [userId, date])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const addEntry = async (
    food: FoodItem,
    amountGrams: number,
    portionLabel: string,
    mealType: MealType
  ) => {
    if (!userId) return

    const nutrition = calculateNutrition(
      food.calories_per_100g,
      food.protein_per_100g,
      food.carbs_per_100g,
      food.fat_per_100g,
      food.fiber_per_100g,
      amountGrams
    )

    const entry = await api.post('/log', {
      log_date: date,
      meal_type: mealType,
      food_id: food.id,
      food_name: food.name,
      food_brand: food.brand ?? null,
      amount_grams: amountGrams,
      portion_label: portionLabel,
      ...nutrition,
    })

    setEntries((prev) => [...prev, entry])
    return entry
  }

  const deleteEntry = async (entryId: string) => {
    await api.del(`/log/${entryId}`)
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + Number(entry.calories),
      protein_g: acc.protein_g + Number(entry.protein_g),
      carbs_g: acc.carbs_g + Number(entry.carbs_g),
      fat_g: acc.fat_g + Number(entry.fat_g),
      fiber_g: acc.fiber_g + Number(entry.fiber_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  )

  return { entries, loading, error, addEntry, deleteEntry, totals, refetch: fetchEntries }
}
