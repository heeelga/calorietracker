import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setToken, clearToken, getToken } from '../lib/api'
import type { Profile } from '../types'

interface AuthContextType {
  user: Profile | null
  loading: boolean
  signInError: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<Profile>
  signOut: () => void
  setUser: (profile: Profile | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInError: null,
  signIn: async () => false,
  signUp: async () => { throw new Error('not ready') },
  signOut: () => {},
  setUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signInError, setSignInError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      // Try existing JWT first
      const token = getToken()
      if (token) {
        try {
          const profile = await api.get('/profile')
          if (!cancelled) { setUser(profile); setLoading(false) }
          return
        } catch {
          clearToken()
        }
      }
      // Try mTLS auto-login (Traefik passes client cert CN)
      try {
        const { token: mtlsToken, profile } = await api.get('/auth/mtls')
        setToken(mtlsToken)
        if (!cancelled) setUser(profile)
      } catch {
        // No cert or user not found — show login normally
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
      setSignInError(err instanceof Error ? err.message : 'Fehler beim Anmelden')
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

  return (
    <AuthContext.Provider value={{ user, loading, signInError, signIn, signUp, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
