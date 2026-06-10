import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Leaf, UserPlus, LogIn } from 'lucide-react'

export default function Login() {
  const { allUsers, signIn, signUp, loading } = useAuth()
  const navigate = useNavigate()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (userId: string) => {
    try {
      await signIn(userId)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anmelden')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError(null)
    setCreating(true)
    try {
      await signUp(newName.trim())
      navigate('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Existing users */}
        {allUsers.length > 0 && (
          <div className="mb-6">
            <p className="text-slate-400 text-sm mb-3 font-medium">Profil auswählen</p>
            <div className="flex flex-col gap-2">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u.id)}
                  className="flex items-center gap-3 p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 font-bold text-sm">
                      {(u.name ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">{u.name ?? 'Unbenannt'}</p>
                    <p className="text-xs text-slate-400">Level {u.level} • {u.xp} XP</p>
                  </div>
                  <LogIn size={16} className="ml-auto text-green-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create new user */}
        <div>
          <p className="text-slate-400 text-sm mb-3 font-medium">
            {allUsers.length === 0 ? 'Neues Profil erstellen' : 'Neues Profil hinzufügen'}
          </p>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Dein Name"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {creating ? 'Erstellen...' : 'Profil erstellen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
