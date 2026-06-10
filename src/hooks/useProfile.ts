import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/db'
import type { Profile } from '../types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await db.profiles.get(userId)
      setProfile(data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Profils')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return

    try {
      await db.profiles.update(userId, updates)
      const updated = await db.profiles.get(userId)
      setProfile(updated ?? null)
      return updated
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    }
  }

  return { profile, loading, error, updateProfile, refetch: fetchProfile }
}
