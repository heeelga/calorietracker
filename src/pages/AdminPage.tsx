import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import type { Profile } from '../types'
import { Shield, ShieldOff, Key, UserPlus, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function AdminPage() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: allUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin_users'],
    queryFn: () => api.get('/admin/users') as Promise<Profile[]>,
    enabled: !!profile?.is_admin,
  })

  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (!profile?.is_admin) {
    return (
      <Layout showNav>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <ShieldOff size={48} className="text-slate-600" />
          <p className="text-slate-400">Kein Zugriff. Nur für Administratoren.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors text-sm"
          >
            Zurück
          </button>
        </div>
      </Layout>
    )
  }

  const handleToggleBan = async (targetUser: Profile) => {
    if (targetUser.id === user?.id) return
    setActionLoading(targetUser.id + '_ban')
    try {
      await api.put(`/admin/users/${targetUser.id}/ban`, {})
      refetchUsers()
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleAdmin = async (targetUser: Profile) => {
    if (targetUser.id === user?.id) return
    setActionLoading(targetUser.id + '_admin')
    try {
      await api.put(`/admin/users/${targetUser.id}/admin`, {})
      refetchUsers()
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (targetUserId: string) => {
    setResetError(null)
    setResetSuccess(null)
    if (!newPassword || newPassword.length < 4) {
      setResetError('Passwort muss mindestens 4 Zeichen haben')
      return
    }
    setActionLoading(targetUserId + '_pw')
    try {
      await api.put(`/admin/users/${targetUserId}/password`, { password: newPassword })
      setResetSuccess('Passwort wurde zurückgesetzt')
      setNewPassword('')
      setTimeout(() => {
        setResetPasswordUserId(null)
        setResetSuccess(null)
      }, 2000)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Fehler beim Zurücksetzen')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!createName.trim()) {
      setCreateError('Bitte einen Namen eingeben')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!createEmail.trim() || !emailRegex.test(createEmail.trim())) {
      setCreateError('Bitte eine gültige E-Mail-Adresse eingeben')
      return
    }
    if (createPassword.length < 4) {
      setCreateError('Passwort muss mindestens 4 Zeichen haben')
      return
    }

    setCreating(true)
    try {
      await api.post('/admin/users', {
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        is_admin: false,
      })
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      setCreateSuccess(`Benutzer "${createName.trim()}" wurde erstellt`)
      setCreateName('')
      setCreateEmail('')
      setCreatePassword('')
      setTimeout(() => setCreateSuccess(null), 3000)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-200">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-green-400" />
            <h2 className="text-lg font-bold text-slate-100">Administration</h2>
          </div>
        </div>

        {/* User list */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Benutzer ({allUsers.length})</h3>
          <div className="flex flex-col gap-3">
            {allUsers.map((u) => (
              <div key={u.id} className="bg-slate-700 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">{u.name ?? 'Unbenannt'}</p>
                      {!!u.is_admin && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-md font-medium">
                          Admin
                        </span>
                      )}
                      {!!u.is_banned && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-md font-medium">
                          Gesperrt
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{u.email ?? 'Keine E-Mail'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Erstellt: {new Date(u.created_at).toLocaleDateString('de-DE')} · Lv.{u.level} · {u.xp} XP
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {u.id !== user?.id && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Ban toggle */}
                    <button
                      onClick={() => handleToggleBan(u)}
                      disabled={actionLoading === u.id + '_ban'}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.is_banned
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {u.is_banned ? <Shield size={12} /> : <ShieldOff size={12} />}
                      {u.is_banned ? 'Entsperren' : 'Sperren'}
                    </button>

                    {/* Admin toggle */}
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      disabled={actionLoading === u.id + '_admin'}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.is_admin
                          ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      <ShieldCheck size={12} />
                      {u.is_admin ? 'Admin entfernen' : 'Admin vergeben'}
                    </button>

                    {/* Password reset */}
                    <button
                      onClick={() => {
                        setResetPasswordUserId(resetPasswordUserId === u.id ? null : u.id)
                        setNewPassword('')
                        setResetError(null)
                        setResetSuccess(null)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Key size={12} />
                      Passwort zurücksetzen
                    </button>
                  </div>
                )}

                {/* Password reset form */}
                {resetPasswordUserId === u.id && (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Neues Passwort (min. 4 Zeichen)"
                      className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 text-sm"
                    />
                    {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
                    {resetSuccess && <p className="text-green-400 text-xs">{resetSuccess}</p>}
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      disabled={actionLoading === u.id + '_pw'}
                      className="w-full py-2 bg-amber-500 text-white font-semibold rounded-lg text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      Passwort setzen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Create new user */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Neuen Benutzer anlegen</h3>
            <button
              onClick={() => {
                setShowCreateForm((v) => !v)
                setCreateError(null)
                setCreateSuccess(null)
              }}
              className="flex items-center gap-1 text-xs text-green-400 font-medium hover:text-green-300"
            >
              <UserPlus size={14} />
              {showCreateForm ? 'Schließen' : 'Anlegen'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Passwort</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Passwort (min. 4 Zeichen)"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              {createSuccess && <p className="text-green-400 text-sm">{createSuccess}</p>}
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
              >
                {creating ? 'Erstellen...' : 'Benutzer erstellen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}
