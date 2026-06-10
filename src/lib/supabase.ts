import { createClient } from '@supabase/supabase-js'
import type { Profile, LogEntry, WeightEntry, Meal, MealIngredient, Badge, FavoriteFood } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      log_entries: {
        Row: LogEntry
        Insert: Omit<LogEntry, 'id' | 'created_at'>
        Update: Partial<LogEntry>
      }
      weight_log: {
        Row: WeightEntry
        Insert: Omit<WeightEntry, 'id' | 'created_at'>
        Update: Partial<WeightEntry>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at' | 'updated_at' | 'ingredients'>
        Update: Partial<Omit<Meal, 'ingredients'>>
      }
      meal_ingredients: {
        Row: MealIngredient
        Insert: Omit<MealIngredient, 'id'>
        Update: Partial<MealIngredient>
      }
      badges: {
        Row: Badge
        Insert: Omit<Badge, 'id' | 'earned_at'>
        Update: never
      }
      favorites: {
        Row: FavoriteFood
        Insert: Omit<FavoriteFood, 'id' | 'created_at'>
        Update: Partial<FavoriteFood>
      }
    }
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
