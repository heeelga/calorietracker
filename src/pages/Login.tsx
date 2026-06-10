import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Leaf, UserPlus, Eye, EyeOff, ChevronDown } from 'lucide-react'

export default function Login() {
  const { allUsers, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()

  // User list state — track which user is expanded for password entry
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})
  const [loggingIn, setLoggingIn] = useState<string | null>(null)

  // New account form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleUserClick = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
    } else {
      setExpandedUserId(userId)
      setLoginErrors((prev) => ({ ...prev, [userId]: '' }))
    }
  }

  const handleLogin = async (userId: string) => {
    const password = passwords[userId] ?? ''
    if (!password) {
      setLoginErrors((prev) => ({ ...prev, [userId]: 'Bitte Passwort eingeben' }))
      return
    }
    setLoggingIn(userId)
    setLoginErrors((prev) => ({ ...prev, [userId]: '' }))
    try {
      const success = await signIn(userId, password)
      if (!success) {
        setLoginErrors((prev) => ({ ...prev, [userId]: 'Falsches Passwort' }))
        return
      }
      // Get updated user to check onboarding
      const user = allUsers.find((u) => u.id === userId)
      if (user && !user.onboarding_done) {
        navigate('/onboarding')
      } else {
        navigate('/')
      }
    } catch (err) {
      setLoginErrors((prev) => ({
        ...prev,
        [userId]: err instanceof Error ? err.message : 'Fehler beim Anmelden',
      }))
    } finally {
      setLoggingIn(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!newName.trim()) {
      setCreateError('Bitte einen Namen eingeben')
      return
    }
    if (newPassword.length < 4) {
      setCreateError('Passwort muss mindestens 4 Zeichen haben')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setCreateError('Passwörter stimmen nicht überein')
      return
    }

    setCreating(true)
    try {
      await signUp(newName.trim(), newPassword)
      navigate('/onboarding')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-green-500/20">
            <Leaf size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">KalTracker</h1>
          <p className="text-slate-400 text-sm mt-1">Dein persönlicher Ernährungscoach</p>
        </div>

        {/* Existing users */}
        {allUsers.length > 0 && (
          <div className="mb-6">
            <p className="text-slate-400 text-sm mb-3 font-medium">Profil auswählen</p>
            <div className="flex flex-col gap-2">
              {allUsers.map((u) => (
                <div key={u.id} className="bg-slate-800 rounded-2xl overflow-hidden">
                  {/* User row */}
                  <button
                    onClick={() => handleUserClick(u.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold text-sm">
                        {(u.name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-100">{u.name ?? 'Unbenannt'}</p>
                      <p className="text-xs text-slate-400">Level {u.level} • {u.xp} XP</p>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${expandedUserId === u.id ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Password expansion */}
                  {expandedUserId === u.id && (
                    <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 flex flex-col gap-2">
                      <div className="relative">
                        <input
                          type={showPasswords[u.id] ? 'text' : 'password'}
                          value={passwords[u.id] ?? ''}
                          onChange={(e) =>
                            setPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLogin(u.id)
                          }}
                          placeholder="Passwort"
                          autoFocus
                          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPasswords[u.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {loginErrors[u.id] && (
                        <p className="text-red-400 text-xs">{loginErrors[u.id]}</p>
                      )}
                      <button
                        onClick={() => handleLogin(u.id)}
                        disabled={loggingIn === u.id}
                        className="w-full py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
                      >
                        {loggingIn === u.id ? 'Anmelden...' : 'Anmelden'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create new account */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-600 transition-colors border border-slate-600"
          >
            <UserPlus size={18} className="text-green-400" />
            Neuen Account erstellen
          </button>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-5">
            <h3 className="text-slate-100 font-semibold mb-4">Neues Profil</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Dein Name"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passwort</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Passwort (min. 4 Zeichen)"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passwort wiederholen</label>
                <div className="relative">
                  <input
                    type={showNewPasswordConfirm ? 'text' : 'password'}
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Passwort bestätigen"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPasswordConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {createError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateError(null)
                    setNewName('')
                    setNewPassword('')
                    setNewPasswordConfirm('')
                  }}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-600 transition-colors text-sm"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {creating ? 'Erstellen...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
