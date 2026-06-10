export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
}

export interface Profile {
  id: string
  name: string | null
  height_cm: number | null
  weight_kg: number | null
  birth_year: number | null
  gender: 'male' | 'female' | 'other' | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
  goal: 'lose' | 'maintain' | 'gain' | null
  calorie_target: number | null
  protein_target_g: number | null
  carbs_target_g: number | null
  fat_target_g: number | null
  xp: number
  level: number
  streak_days: number
  last_log_date: string | null
  onboarding_done: boolean
  created_at: string
}

export interface LogEntry {
  id: string
  user_id: string
  log_date: string
  meal_type: MealType
  food_id: string | null
  food_name: string
  food_brand: string | null
  amount_grams: number
  portion_label: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  created_at: string
}

export interface WeightEntry {
  id: string
  user_id: string
  log_date: string
  weight_kg: number
  created_at: string
}

export interface MealIngredient {
  id: string
  meal_id: string
  food_name: string
  food_brand: string | null
  food_id: string | null
  amount_grams: number
  portion_label: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface Meal {
  id: string
  user_id: string
  name: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  created_at: string
  ingredients?: MealIngredient[]
}

export interface Badge {
  id: string
  user_id: string
  badge_key: string
  earned_at: string
}

export interface FavoriteFood {
  id: string
  user_id: string
  food_name: string
  food_brand: string | null
  food_id: string | null
  barcode: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  image_url: string | null
  package_weight_g: number | null
  created_at: string
}

export interface FoodItem {
  id: string
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  image_url?: string
  barcode?: string
  package_weight_g?: number
  source: 'openfoodfacts' | 'custom' | 'manual'
}
