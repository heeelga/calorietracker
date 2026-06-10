import type { Profile } from '../types'

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): number {
  // Mifflin-St Jeor equation
  const base = 10 * weight + 6.25 * height - 5 * age
  if (gender === 'male') return Math.round(base + 5)
  if (gender === 'female') return Math.round(base - 161)
  return Math.round(base - 78) // average for 'other'
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  const multiplier = multipliers[activityLevel] ?? 1.55
  return Math.round(bmr * multiplier)
}

export function calculateTargets(
  profile: Profile,
  targetWeight?: number | null,
  timeframeWeeks?: number | null
): {
  calories: number
  protein: number
  carbs: number
  fat: number
} {
  const currentYear = new Date().getFullYear()
  const age = profile.birth_year ? currentYear - profile.birth_year : 30
  const weight = profile.weight_kg ?? 70
  const height = profile.height_cm ?? 170
  const gender = profile.gender ?? 'other'
  const activityLevel = profile.activity_level ?? 'moderate'
  const goal = profile.goal ?? 'maintain'

  const bmr = calculateBMR(weight, height, age, gender)
  const tdee = calculateTDEE(bmr, activityLevel)

  let calories = tdee

  if (goal === 'maintain') {
    // No adjustment
  } else if (targetWeight != null && timeframeWeeks != null && timeframeWeeks > 0) {
    // Use timeline-based calculation
    const kgDiff = Math.abs(targetWeight - weight)
    const days = timeframeWeeks * 7
    const kcalPerDay = (kgDiff * 7700) / days

    if (goal === 'lose') {
      const deficit = Math.min(kcalPerDay, 1000)
      calories = tdee - deficit
    } else {
      // gain
      const surplus = Math.min(kcalPerDay, 500)
      calories = tdee + surplus
    }
  } else {
    // Flat fallback
    if (goal === 'lose') calories = tdee - 500
    else if (goal === 'gain') calories = tdee + 300
  }

  calories = Math.max(1200, Math.round(calories))

  // Macros: 30% protein, 40% carbs, 30% fat
  const protein = Math.round((calories * 0.3) / 4)
  const carbs = Math.round((calories * 0.4) / 4)
  const fat = Math.round((calories * 0.3) / 9)

  return { calories, protein, carbs, fat }
}

export function calculateNutrition(
  calories_per_100g: number,
  protein_per_100g: number,
  carbs_per_100g: number,
  fat_per_100g: number,
  fiber_per_100g: number,
  amount_grams: number
): {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
} {
  const factor = amount_grams / 100
  return {
    calories: Math.round(calories_per_100g * factor * 10) / 10,
    protein_g: Math.round(protein_per_100g * factor * 10) / 10,
    carbs_g: Math.round(carbs_per_100g * factor * 10) / 10,
    fat_g: Math.round(fat_per_100g * factor * 10) / 10,
    fiber_g: Math.round(fiber_per_100g * factor * 10) / 10,
  }
}
