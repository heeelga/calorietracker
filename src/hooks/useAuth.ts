import { sha256 } from 'js-sha256'
import { generateId } from '../lib/uuid'
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
        }
        // Note: we no longer auto-login even for single-profile cases
        // because we now require password authentication
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const signIn = useCallback(async (userId: string, password: string): Promise<boolean> => {
    const profile = await db.profiles.get(userId)
    if (!profile) throw new Error('Benutzer nicht gefunden')

    const hash = sha256(password)

    if (profile.password_hash === null) {
      // Legacy profile without password — allow login and set password
      await db.profiles.update(userId, { password_hash: hash })
      const updated = await db.profiles.get(userId)
      localStorage.setItem(CURRENT_USER_KEY, userId)
      setUser(updated ?? profile)
      return true
    }

    if (hash !== profile.password_hash) {
      return false
    }

    localStorage.setItem(CURRENT_USER_KEY, userId)
    setUser(profile)
    return true
  }, [])

  const signUp = useCallback(async (name: string, password: string): Promise<Profile> => {
    const now = new Date().toISOString()
    const hash = sha256(password)
    const newProfile: Profile = {
      id: generateId(),
      name,
      height_cm: null,
      weight_kg: null,
      birth_year: null,
      gender: null,
      activity_level: null,
      goal: null,
      target_weight_kg: null,
      calorie_target: null,
      protein_target_g: null,
      carbs_target_g: null,
      fat_target_g: null,
      xp: 0,
      level: 1,
      streak_days: 0,
      last_log_date: null,
      onboarding_done: false,
      password_hash: hash,
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
