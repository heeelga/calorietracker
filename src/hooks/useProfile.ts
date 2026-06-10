import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (err) throw err
      setProfile(data)
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
      const { data, error: err } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (err) throw err
      setProfile(data)
      return data
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    }
  }

  return { profile, loading, error, updateProfile, refetch: fetchProfile }
}
