import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useDailyLog } from '../hooks/useDailyLog'
import MacroRing from '../components/MacroRing'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { useRewards } from '../hooks/useRewards'
import { useBadgeNotification } from '../contexts/BadgeNotificationContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Flame, Star, Plus, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import type { MealType } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

interface BodyMeasurement {
  id: string
  log_date: string
  weight_kg: number | null
  fat_pct: number | null
  muscle_pct: number | null
  visceral: number | null
  note: string | null
}

const today = new Date().toISOString().split('T')[0]

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { entries, totals } = useDailyLog(user?.id, today)
  const { checkAndAwardBadges, getEarnedBadges } = useRewards(user?.id)
  const { showBadge } = useBadgeNotification()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [showBodyForm, setShowBodyForm] = useState(false)
  const [bodyWeight, setBodyWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [bodyMuscle, setBodyMuscle] = useState('')
  const [bodyVisceral, setBodyVisceral] = useState('')
  const [bodyNote, setBodyNote] = useState('')
  const [bodySaving, setBodySaving] = useState(false)
  const [bodySaved, setBodySaved] = useState(false)

  const { data: lastMeasurements = [] } = useQuery({
    queryKey: ['measurements', user?.id],
    queryFn: () => api.get('/measurements?limit=2') as Promise<BodyMeasurement[]>,
    enabled: !!user,
  })

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Guten Morgen'
    if (hour < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleBodySave = async () => {
    if (!user) return
    if (!bodyWeight && !bodyFat && !bodyMuscle && !bodyVisceral) return
    setBodySaving(true)
    try {
      await api.post('/measurements', {
        log_date: today,
        weight_kg: bodyWeight ? parseFloat(bodyWeight) : null,
        fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        muscle_pct: bodyMuscle ? parseFloat(bodyMuscle) : null,
        visceral: bodyVisceral ? parseInt(bodyVisceral) : null,
        note: bodyNote || null,
      })
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
      // Award weight_log badge if first time
      if (profile) {
        const earnedKeys = await getEarnedBadges()
        const newBadges = await checkAndAwardBadges(profile, earnedKeys, 0, { weightLogged: true })
        for (const badge of newBadges) showBadge(badge)
      }
      setBodySaved(true)
      setBodyWeight(''); setBodyFat(''); setBodyMuscle(''); setBodyVisceral(''); setBodyNote('')
      setShowBodyForm(false)
      setTimeout(() => setBodySaved(false), 2000)
    } finally {
      setBodySaving(false)
    }
  }

  const recentEntries = [...entries].reverse().slice(0, 5)

  const xpProgress = profile ? ((profile.xp % 100) / 100) * 100 : 0

  return (
    <Layout showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Header greeting */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">{dateLabel}</p>
            <h2 className="text-xl font-bold text-slate-100">
              {greeting()}{profile?.name ? `, ${profile.name}` : ''}!
            </h2>
          </div>
          {profile && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-orange-500/10 rounded-xl px-2 py-1">
                <Flame size={14} className="text-orange-400" />
                <span className="text-xs font-semibold text-orange-400">{profile.streak_days}d</span>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/10 rounded-xl px-2 py-1">
                <Star size={14} className="text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400">Lv.{profile.level}</span>
              </div>
            </div>
          )}
        </div>

        {/* Macro Ring */}
        {profile && (
          <MacroRing
            calories={totals.calories}
            calorieTarget={profile.calorie_target}
            protein={totals.protein_g}
            proteinTarget={profile.protein_target_g}
            carbs={totals.carbs_g}
            carbsTarget={profile.carbs_target_g}
            fat={totals.fat_g}
            fatTarget={profile.fat_target_g}
          />
        )}

        {/* Macro Progress Bars */}
        {profile && (
          <div className="bg-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Tagesübersicht</h3>
            <div className="flex flex-col gap-4">
              {/* Calories */}
              {(() => {
                const target = profile.calorie_target ?? 2000
                const val = totals.calories
                const pct = Math.min((val / target) * 100, 100)
                const over = val > target
                const color = over
                  ? '#ef4444'
                  : pct >= 90
                  ? '#ef4444'
                  : pct >= 70
                  ? '#f97316'
                  : '#22c55e'
                return (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-medium text-slate-200">Kalorien</span>
                      <span>{Math.round(val)} / {target} kcal</span>
                    </div>
                    <div className="relative h-4 bg-slate-700 rounded-full overflow-visible">
                      <div
                        className={`h-full rounded-full transition-all ${over ? 'animate-pulse' : ''}`}
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                      {val > 0 && (
                        <span
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-full text-sm leading-none ${pct > 1 && pct < 100 ? 'animate-bounce' : ''}`}
                          style={{ left: `${Math.min(pct, 100)}%` }}
                        >
                          {over ? '💥' : '🔥'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}
              {/* Protein */}
              {(() => {
                const target = profile.protein_target_g ?? 150
                const val = totals.protein_g
                const pct = Math.min((val / target) * 100, 100)
                return (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-medium text-slate-200">Eiweiß</span>
                      <span>{Math.round(val)}g / {target}g</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }}
                      />
                    </div>
                  </div>
                )
              })()}
              {/* Carbs */}
              {(() => {
                const target = profile.carbs_target_g ?? 250
                const val = totals.carbs_g
                const pct = Math.min((val / target) * 100, 100)
                return (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-medium text-slate-200">Kohlenhydrate</span>
                      <span>{Math.round(val)}g / {target}g</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: '#f59e0b' }}
                      />
                    </div>
                  </div>
                )
              })()}
              {/* Fat */}
              {(() => {
                const target = profile.fat_target_g ?? 65
                const val = totals.fat_g
                const pct = Math.min((val / target) * 100, 100)
                return (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-medium text-slate-200">Fett</span>
                      <span>{Math.round(val)}g / {target}g</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: '#a855f7' }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* XP bar */}
        {profile && (
          <div className="bg-slate-800 rounded-2xl px-4 py-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400">Level {profile.level} Fortschritt</span>
              <span className="text-xs text-slate-400">{profile.xp % 100}/100 XP</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meal quick-add buttons */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Eintrag hinzufügen</h3>
          <div className="grid grid-cols-2 gap-2">
            {MEAL_TYPES.map((meal) => {
              const count = entries.filter((e) => e.meal_type === meal).length
              return (
                <button
                  key={meal}
                  onClick={() => navigate(`/search?meal=${meal}`)}
                  className="flex items-center gap-2 p-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors text-left"
                >
                  <span className="text-xl">{MEAL_EMOJIS[meal]}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{MEAL_TYPE_LABELS[meal]}</p>
                    <p className="text-xs text-slate-400">{count} Einträge</p>
                  </div>
                  <Plus size={14} className="ml-auto text-green-400" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent entries */}
        {recentEntries.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Zuletzt gegessen</h3>
            <div className="flex flex-col gap-2">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100 truncate">{entry.food_name}</p>
                    <p className="text-xs text-slate-400">
                      {MEAL_TYPE_LABELS[entry.meal_type]} • {entry.portion_label ?? `${entry.amount_grams}g`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-400 flex-shrink-0 ml-2">
                    {Math.round(entry.calories)} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body measurements */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowBodyForm((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-green-400" />
              <h3 className="text-sm font-semibold text-slate-300">Körperwerte</h3>
            </div>
            <div className="flex items-center gap-2">
              {lastMeasurements[0]?.weight_kg != null && (
                <span className="text-xs text-slate-400">
                  {Number(lastMeasurements[0].weight_kg).toFixed(1)} kg
                </span>
              )}
              {bodySaved
                ? <span className="text-xs text-green-400 font-medium">Gespeichert!</span>
                : showBodyForm ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />
              }
            </div>
          </button>

          {/* Last measurement summary */}
          {!showBodyForm && lastMeasurements[0] && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'Gewicht', value: lastMeasurements[0].weight_kg, unit: 'kg', decimals: 1 },
                { label: 'Fett', value: lastMeasurements[0].fat_pct, unit: '%', decimals: 1 },
                { label: 'Muskeln', value: lastMeasurements[0].muscle_pct, unit: '%', decimals: 1 },
                { label: 'Viszeral', value: lastMeasurements[0].visceral, unit: '', decimals: 0 },
              ].map(({ label, value, unit, decimals }) => (
                <div key={label} className="bg-slate-700 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="text-sm font-bold text-slate-100">
                    {value != null ? Number(value).toFixed(decimals) : '—'}
                    {value != null && unit && <span className="text-[10px] font-normal text-slate-400 ml-0.5">{unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Entry form */}
          {showBodyForm && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Gewicht (kg)', val: bodyWeight, set: setBodyWeight, step: '0.1', placeholder: '82.5' },
                  { label: 'Körperfett (%)', val: bodyFat, set: setBodyFat, step: '0.1', placeholder: '18.5' },
                  { label: 'Muskelanteil (%)', val: bodyMuscle, set: setBodyMuscle, step: '0.1', placeholder: '42.0' },
                  { label: 'Viszeralwert', val: bodyVisceral, set: setBodyVisceral, step: '1', placeholder: '8' },
                ].map(({ label, val, set, step, placeholder }) => (
                  <div key={label}>
                    <label className="text-[10px] text-slate-400 block mb-1">{label}</label>
                    <input
                      type="number" value={val} onChange={(e) => set(e.target.value)}
                      step={step} placeholder={placeholder}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>
                ))}
              </div>
              <textarea
                value={bodyNote} onChange={(e) => setBodyNote(e.target.value)}
                placeholder="Notiz (optional)"
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm resize-none"
              />
              <button
                onClick={handleBodySave}
                disabled={bodySaving}
                className="w-full py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors text-sm"
              >
                {bodySaving ? 'Speichern…' : 'Messung speichern'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
