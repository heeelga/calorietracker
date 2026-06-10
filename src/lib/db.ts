import Dexie, { type Table } from 'dexie'
import type { Profile, LogEntry, WeightEntry, Meal, MealIngredient, Badge, FavoriteFood } from '../types'

export class CalorieTrackerDB extends Dexie {
  profiles!: Table<Profile, string>
  log_entries!: Table<LogEntry, string>
  weight_log!: Table<WeightEntry, string>
  meals!: Table<Meal, string>
  meal_ingredients!: Table<MealIngredient, string>
  badges!: Table<Badge, string>
  favorites!: Table<FavoriteFood, string>

  constructor() {
    super('CalorieTrackerDB')
    this.version(1).stores({
      profiles: 'id, name',
      log_entries: 'id, user_id, log_date, meal_type',
      weight_log: 'id, user_id, log_date',
      meals: 'id, user_id, name',
      meal_ingredients: 'id, meal_id',
      badges: 'id, user_id, badge_key',
      favorites: 'id, user_id, food_name',
    })
    this.version(2).stores({
      profiles: 'id, name',
      log_entries: 'id, user_id, log_date, meal_type',
      weight_log: 'id, user_id, log_date',
      meals: 'id, user_id, name',
      meal_ingredients: 'id, meal_id',
      badges: 'id, user_id, badge_key',
      favorites: 'id, user_id, food_name',
    }).upgrade(tx => {
      return tx.table('profiles').toCollection().modify((profile: Profile) => {
        if (!('password_hash' in profile)) {
          (profile as Profile).password_hash = null
        }
        if (!('target_weight_kg' in profile)) {
          (profile as Profile).target_weight_kg = null
        }
      })
    })
  }
}

export const db = new CalorieTrackerDB()
