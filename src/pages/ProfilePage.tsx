import { useState, useRef, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { calculateTargets } from '../lib/nutrition'
import { api, getToken } from '../lib/api'
import { resizeImageToBase64 } from '../lib/imageUtils'
import Layout from '../components/Layout'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, Save, RefreshCw, Flame, Star, Download, Upload, Camera, Pencil, Trash2, X } from 'lucide-react'

interface BodyMeasurement {
  id: string
  log_date: string
  weight_kg: number | null
  fat_pct: number | null
  muscle_pct: number | null
  visceral: number | null
  note: string | null
}

function fmtDate(d: string) {
  return new Date(String(d).slice(0, 10)).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmt(v: number | null, decimals = 1) {
  return v != null ? Number(v).toFixed(decimals) : '—'
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sitzend',
  light: 'Leicht aktiv',
  moderate: 'Mäßig aktiv',
  active: 'Aktiv',
  very_active: 'Sehr aktiv',
}

const GOAL_LABELS: Record<string, string> = {
  lose: 'Abnehmen',
  maintain: 'Gewicht halten',
  gain: 'Zunehmen',
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { profile, loading, updateProfile } = useProfile(user?.id)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null)
  const [mDate, setMDate] = useState('')
  const [mWeight, setMWeight] = useState('')
  const [mFat, setMFat] = useState('')
  const [mMuscle, setMMuscle] = useState('')
  const [mVisceral, setMVisceral] = useState('')
  const [mNote, setMNote] = useState('')
  const [mSaving, setMSaving] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', user?.id],
    queryFn: () => api.get('/measurements?limit=20') as Promise<BodyMeasurement[]>,
    enabled: !!user,
  })

  const startEditMeasurement = (m: BodyMeasurement) => {
    setEditingMeasurement(m)
    setMDate(String(m.log_date).slice(0, 10))
    setMWeight(m.weight_kg != null ? String(m.weight_kg) : '')
    setMFat(m.fat_pct != null ? String(m.fat_pct) : '')
    setMMuscle(m.muscle_pct != null ? String(m.muscle_pct) : '')
    setMVisceral(m.visceral != null ? String(m.visceral) : '')
    setMNote(m.note ?? '')
  }

  const handleUpdateMeasurement = async () => {
    if (!editingMeasurement) return
    setMSaving(true)
    try {
      const newWeight = mWeight ? parseFloat(mWeight) : null
      const newFat = mFat ? parseFloat(mFat) : null
      const newMuscle = mMuscle ? parseFloat(mMuscle) : null
      await api.put(`/measurements/${editingMeasurement.id}`, {
        log_date: mDate,
        weight_kg: newWeight,
        fat_pct: newFat,
        muscle_pct: newMuscle,
        visceral: mVisceral ? parseInt(mVisceral) : null,
        note: mNote || null,
      })
      // Recalculate calorie targets with updated body composition
      if (profile) {
        const updatedProfile = newWeight ? { ...profile, weight_kg: newWeight } : profile
        const targets = calculateTargets(updatedProfile, profile.target_weight_kg, null, {
          fat_pct: newFat,
          muscle_pct: newMuscle,
        })
        await api.put('/profile', {
          ...(newWeight ? { weight_kg: newWeight } : {}),
          calorie_target: targets.calories,
          protein_target_g: targets.protein,
          carbs_target_g: targets.carbs,
          fat_target_g: targets.fat,
        })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      }
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
      setEditingMeasurement(null)
    } finally {
      setMSaving(false)
    }
  }

  const handleDeleteMeasurement = async (id: string) => {
    await api.del(`/measurements/${id}`)
    queryClient.invalidateQueries({ queryKey: ['measurements'] })
  }

  // Edit form state
  const [name, setName] = useState('')
  const [height, setHeight] = useState(170)
  const [weight, setWeight] = useState(70)
  const [birthYear, setBirthYear] = useState(1990)
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [goal, setGoal] = useState('maintain')

  const startEditing = () => {
    if (!profile) return
    setName(profile.name ?? '')
    setHeight(profile.height_cm ?? 170)
    setWeight(profile.weight_kg ?? 70)
    setBirthYear(profile.birth_year ?? 1990)
    setGender(profile.gender ?? 'other')
    setActivityLevel(profile.activity_level ?? 'moderate')
    setGoal(profile.goal ?? 'maintain')
    setEditing(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        name,
        height_cm: height,
        weight_kg: weight,
        birth_year: birthYear,
        gender,
        activity_level: activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
        goal: goal as 'lose' | 'maintain' | 'gain',
      })
      setSuccess(true)
      setEditing(false)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const token = getToken()
      const res = await fetch('/api/data/export', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="([^"]+)"/)
      a.download = match ? match[1] : 'kaltracker-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export fehlgeschlagen')
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await api.post('/data/import', data)
      const { imported } = result
      setImportResult(
        `Import erfolgreich: ${imported.log_entries} Einträge, ${imported.meals} Gerichte, ${imported.favorites} Lebensmittel, ${imported.badges} Abzeichen`
      )
    } catch (err) {
      setImportResult('Import fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'))
    } finally {
      setImportLoading(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const base64 = await resizeImageToBase64(file, 200, 0.85)
      await updateProfile({ avatar_url: base64 })
    } catch {
      setError('Profilbild konnte nicht gespeichert werden')
    } finally {
      setAvatarLoading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleRecalculate = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const targets = calculateTargets(profile)
      await updateProfile({
        calorie_target: targets.calories,
        protein_target_g: targets.protein,
        carbs_target_g: targets.carbs,
        fat_target_g: targets.fat,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Profil" showNav>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  const xpProgress = profile ? ((profile.xp % 100) / 100) * 100 : 0
  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Layout title="Profil" showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Avatar + name + level */}
        <div className="bg-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profilbild"
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
            >
              {avatarLoading ? (
                <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={11} className="text-slate-300" />
              )}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-100 truncate">{profile?.name ?? 'Benutzer'}</h2>
            <p className="text-sm text-slate-400 truncate">{user?.name ?? ''}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400">Level {profile?.level ?? 1}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame size={14} className="text-orange-400" />
                <span className="text-sm text-orange-400">{profile?.streak_days ?? 0} Tage Serie</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP progress */}
        {profile && (
          <div className="bg-slate-800 rounded-2xl px-4 py-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400">XP-Fortschritt</span>
              <span className="text-xs text-slate-400">{profile.xp % 100} / 100 XP</span>
            </div>
            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Gesamt: {profile.xp} XP</p>
          </div>
        )}

        {/* Current targets */}
        {profile && !editing && (
          <div className="bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Tagesziele</h3>
              <button
                onClick={handleRecalculate}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
              >
                <RefreshCw size={12} />
                Neu berechnen
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700 rounded-xl p-3">
                <p className="text-xs text-slate-400">Kalorien</p>
                <p className="text-xl font-bold text-green-400">{profile.calorie_target}</p>
                <p className="text-[10px] text-slate-500">kcal/Tag</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-3">
                <p className="text-xs text-slate-400">Eiweiß</p>
                <p className="text-xl font-bold text-slate-100">{profile.protein_target_g}g</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-3">
                <p className="text-xs text-slate-400">Kohlenhydrate</p>
                <p className="text-xl font-bold text-slate-100">{profile.carbs_target_g}g</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-3">
                <p className="text-xs text-slate-400">Fett</p>
                <p className="text-xl font-bold text-slate-100">{profile.fat_target_g}g</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile info / edit */}
        {!editing ? (
          <div className="bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Meine Daten</h3>
              <button onClick={startEditing} className="text-xs text-green-400 font-medium hover:text-green-300">
                Bearbeiten
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {[
                ['Größe', profile?.height_cm ? `${profile.height_cm} cm` : '—'],
                ['Gewicht', profile?.weight_kg ? `${profile.weight_kg} kg` : '—'],
                ['Aktivität', ACTIVITY_LABELS[profile?.activity_level ?? ''] ?? '—'],
                ['Ziel', GOAL_LABELS[profile?.goal ?? ''] ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-medium text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-300">Profil bearbeiten</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Größe (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value))} min={140} max={220}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Gewicht (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value))} min={30} max={300} step={0.1}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Geburtsjahr</label>
                <input type="number" value={birthYear} onChange={(e) => setBirthYear(parseInt(e.target.value))} min={1940} max={2005}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Geschlecht</label>
                <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500">
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                  <option value="other">Divers</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Aktivitätslevel</label>
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500">
                {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Ziel</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500">
                {Object.entries(GOAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-600">
                Abbrechen
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50">
                <Save size={16} />
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <p className="text-green-400 text-sm font-medium">Gespeichert!</p>
          </div>
        )}

        {/* Export / Import */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Daten sichern &amp; wiederherstellen</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-700 text-slate-200 font-medium rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50 text-sm"
            >
              <Download size={15} />
              {exportLoading ? 'Wird exportiert…' : 'Daten exportieren (JSON)'}
            </button>

            <button
              onClick={() => importInputRef.current?.click()}
              disabled={importLoading}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-700 text-slate-200 font-medium rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50 text-sm"
            >
              <Upload size={15} />
              {importLoading ? 'Wird importiert…' : 'Daten importieren (JSON)'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />

            {importResult && (
              <p className={`text-xs mt-1 ${importResult.startsWith('Import erfolgreich') ? 'text-green-400' : 'text-red-400'}`}>
                {importResult}
              </p>
            )}
          </div>
        </div>

        {/* Body measurements history */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Körpermessungen</h3>
          {measurements.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Noch keine Messungen vorhanden</p>
          ) : (
            <div className="flex flex-col gap-2">
              {measurements.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 mb-1">{fmtDate(m.log_date)}</p>
                    <div className="flex gap-3 flex-wrap">
                      {m.weight_kg != null && <span className="text-xs text-slate-400">{fmt(m.weight_kg)} kg</span>}
                      {m.fat_pct != null && <span className="text-xs text-slate-400">Fett {fmt(m.fat_pct)}%</span>}
                      {m.muscle_pct != null && <span className="text-xs text-slate-400">Muskeln {fmt(m.muscle_pct)}%</span>}
                      {m.visceral != null && <span className="text-xs text-slate-400">Viszeral {fmt(m.visceral, 0)}</span>}
                    </div>
                    {m.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{m.note}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => startEditMeasurement(m)}
                      className="p-1.5 text-slate-400 hover:text-green-400 rounded-lg hover:bg-green-500/10">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDeleteMeasurement(m.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={16} />
          Abmelden
        </button>
      </div>

      {/* Edit measurement modal */}
      {editingMeasurement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">Messung bearbeiten</h3>
              <button onClick={() => setEditingMeasurement(null)} className="text-slate-400 hover:text-slate-100">
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Datum</label>
              <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Gewicht (kg)', val: mWeight, set: setMWeight, step: '0.1' },
                { label: 'Körperfett (%)', val: mFat, set: setMFat, step: '0.1' },
                { label: 'Muskelanteil (%)', val: mMuscle, set: setMMuscle, step: '0.1' },
                { label: 'Viszeralwert', val: mVisceral, set: setMVisceral, step: '1' },
              ].map(({ label, val, set, step }) => (
                <div key={label}>
                  <label className="text-xs text-slate-400 block mb-1">{label}</label>
                  <input type="number" value={val} onChange={(e) => set(e.target.value)} step={step}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Notiz</label>
              <textarea value={mNote} onChange={(e) => setMNote(e.target.value)} rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500 resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingMeasurement(null)}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-600 text-sm">
                Abbrechen
              </button>
              <button onClick={handleUpdateMeasurement} disabled={mSaving}
                className="flex-1 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 text-sm">
                {mSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
