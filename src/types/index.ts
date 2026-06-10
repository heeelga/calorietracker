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
}

export interface Profile {
  id: string
  email?: string
  name?: string
  gender?: 'male' | 'female' | 'other'
  birth_year?: number
  height_cm?: number
  weight_kg?: number
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal?: 'lose' | 'maintain' | 'gain'
  calorie_target: number
  protein_target_g: number
  carbs_target_g: number
  fat_target_g: number
  xp: number
  level: number
  streak_days: number
  last_log_date?: string
  onboarding_done: boolean
  created_at?: string
  updated_at?: string
}

export interface LogEntry {
  id: string
  user_id: string
  log_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_id: string
  food_name: string
  food_brand?: string
  amount_grams: number
  portion_label?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  created_at?: string
}

export interface WeightEntry {
  id: string
  user_id: string
  log_date: string
  weight_kg: number
  note?: string
  created_at?: string
}

export interface Meal {
  id: string
  user_id: string
  name: string
  description?: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  total_fiber_g: number
  servings: number
  created_at?: string
  updated_at?: string
  ingredients?: MealIngredient[]
}

export interface MealIngredient {
  id: string
  meal_id: string
  food_id: string
  food_name: string
  food_brand?: string
  amount_grams: number
  portion_label?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
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
  food_id: string
  food_name: string
  food_brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  barcode?: string
  package_weight_g?: number
  image_url?: string
  created_at?: string
}

export interface NutritionSummary {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
}
