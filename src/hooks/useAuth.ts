import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/db'
import type { Profile } from '../types'

const CURRENT_USER_KEY = 'currentUserId'

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    const profiles = await db.profiles.toArray()
    setAllUsers(profiles)
    return profiles
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const profiles = await db.profiles.toArray()
        if (cancelled) return
        setAllUsers(profiles)

        const storedId = localStorage.getItem(CURRENT_USER_KEY)
        if (storedId) {
          const profile = await db.profiles.get(storedId)
          if (!cancelled) setUser(profile ?? null)
        } else if (profiles.length === 1) {
          // Auto-login when there is exactly one profile
          localStorage.setItem(CURRENT_USER_KEY, profiles[0].id)
          if (!cancelled) setUser(profiles[0])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const signIn = useCallback(async (userId: string) => {
    const profile = await db.profiles.get(userId)
    if (!profile) throw new Error('Benutzer nicht gefunden')
    localStorage.setItem(CURRENT_USER_KEY, userId)
    setUser(profile)
  }, [])

  const signUp = useCallback(async (name: string) => {
    const now = new Date().toISOString()
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name,
      height_cm: null,
      weight_kg: null,
      birth_year: null,
      gender: null,
      activity_level: null,
      goal: null,
      calorie_target: null,
      protein_target_g: null,
      carbs_target_g: null,
      fat_target_g: null,
      xp: 0,
      level: 1,
      streak_days: 0,
      last_log_date: null,
      onboarding_done: false,
      created_at: now,
    }
    await db.profiles.add(newProfile)
    localStorage.setItem(CURRENT_USER_KEY, newProfile.id)
    const updated = await db.profiles.toArray()
    setAllUsers(updated)
    setUser(newProfile)
    return newProfile
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY)
    setUser(null)
  }, [])

  return { user, loading, signIn, signUp, signOut, allUsers, refetchUsers: loadUsers }
}
