import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Leaf, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn, signUp, loading, signInError } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoggingIn(true)
    try {
      const success = await signIn(email, password)
      if (success) {
        navigate('/')
      }
    } finally {
      setLoggingIn(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!regName.trim()) {
      setCreateError('Bitte einen Namen eingeben')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      setCreateError('Bitte eine gültige E-Mail-Adresse eingeben')
      return
    }
    if (regPassword.length < 4) {
      setCreateError('Passwort muss mindestens 4 Zeichen haben')
      return
    }
    if (regPassword !== regPasswordConfirm) {
      setCreateError('Passwörter stimmen nicht überein')
      return
    }

    setCreating(true)
    try {
      await signUp(regName.trim(), regEmail.trim(), regPassword)
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

        {mode === 'login' ? (
          <div className="bg-slate-800 rounded-2xl p-5">
            <h3 className="text-slate-100 font-semibold mb-4">Anmelden</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  autoFocus
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passwort</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {signInError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{signInError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
              >
                {loggingIn ? 'Anmelden...' : 'Anmelden'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-4">
              Noch kein Konto?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-green-400 hover:text-green-300 font-medium"
              >
                Konto erstellen
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-5">
            <h3 className="text-slate-100 font-semibold mb-4">Konto erstellen</h3>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Dein Name"
                  autoFocus
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passwort</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Passwort (min. 4 Zeichen)"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passwort wiederholen</label>
                <div className="relative">
                  <input
                    type={showRegPasswordConfirm ? 'text' : 'password'}
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Passwort bestätigen"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPasswordConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showRegPasswordConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
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
                    setMode('login')
                    setCreateError(null)
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

            <p className="text-center text-xs text-slate-400 mt-4">
              Bereits ein Konto?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-green-400 hover:text-green-300 font-medium"
              >
                Anmelden
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
