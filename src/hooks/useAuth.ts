import { useState, useEffect, useCallback } from 'react'
import { api, setToken, clearToken, getToken } from '../lib/api'
import type { Profile } from '../types'

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signInError, setSignInError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const token = getToken()
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const profile = await api.get('/profile')
        if (!cancelled) setUser(profile)
      } catch {
        clearToken()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setSignInError(null)
    try {
      const { token, profile } = await api.post('/auth/login', { email, password })
      setToken(token)
      setUser(profile)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Anmelden'
      setSignInError(msg)
      return false
    }
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<Profile> => {
    const { token, profile } = await api.post('/auth/register', { name, email, password })
    setToken(token)
    setUser(profile)
    return profile
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return { user, loading, signIn, signUp, signOut, signInError }
}
