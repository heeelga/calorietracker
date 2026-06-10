import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { calculateTargets, calculateBMR, calculateTDEE } from '../lib/nutrition'
import type { Profile } from '../types'
import { ChevronRight, ChevronLeft } from 'lucide-react'

type Step = 1 | 2 | 3 | 4

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sitzend', desc: 'Kaum oder keine Bewegung' },
  { value: 'light', label: 'Leicht aktiv', desc: '1-3 Tage Sport/Woche' },
  { value: 'moderate', label: 'Mäßig aktiv', desc: '3-5 Tage Sport/Woche' },
  { value: 'active', label: 'Aktiv', desc: '6-7 Tage intensiver Sport' },
  { value: 'very_active', label: 'Sehr aktiv', desc: 'Harter Sport täglich oder Arbeit' },
]

const TIMEFRAME_OPTIONS = [
  { label: '4 Wochen', weeks: 4 },
  { label: '8 Wochen', weeks: 8 },
  { label: '12 Wochen', weeks: 12 },
  { label: '16 Wochen', weeks: 16 },
  { label: '6 Monate', weeks: 26 },
  { label: '1 Jahr', weeks: 52 },
]

export default function Onboarding() {
  const { user } = useAuth()
  const { updateProfile } = useProfile(user?.id)
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(user?.name ?? '')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [birthYear, setBirthYear] = useState(1990)
  const [height, setHeight] = useState(170)
  const [weight, setWeight] = useState(70)
  const [activityLevel, setActivityLevel] = useState<Profile['activity_level']>('moderate')
  const [goal, setGoal] = useState<Profile['goal']>('maintain')
  const [targetWeight, setTargetWeight] = useState(65)
  const [timeframeWeeks, setTimeframeWeeks] = useState(12)

  // Live deficit calculation
  const deficitInfo = useMemo(() => {
    if (goal === 'maintain') return null
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear
    const bmr = calculateBMR(weight, height, age, gender)
    const tdee = calculateTDEE(bmr, activityLevel ?? 'moderate')
    const kgDiff = Math.abs(targetWeight - weight)
    const days = timeframeWeeks * 7
    const kcalPerDay = (kgDiff * 7700) / days
    const cappedKcal = goal === 'lose' ? Math.min(kcalPerDay, 1000) : Math.min(kcalPerDay, 500)
    const calorieTarget = goal === 'lose' ? tdee - cappedKcal : tdee + cappedKcal

    let intensity: 'aggressive' | 'ambitious' | 'healthy'
    if (kcalPerDay > 1000) intensity = 'aggressive'
    else if (kcalPerDay > 750) intensity = 'ambitious'
    else intensity = 'healthy'

    return {
      kgDiff: Math.round(kgDiff * 10) / 10,
      kcalPerDay: Math.round(kcalPerDay),
      cappedKcal: Math.round(cappedKcal),
      calorieTarget: Math.max(1200, Math.round(calorieTarget)),
      tdee,
      intensity,
      isCapped: kcalPerDay > cappedKcal,
    }
  }, [goal, weight, targetWeight, timeframeWeeks, birthYear, height, gender, activityLevel])

  const previewProfile: Profile = {
    id: user?.id ?? '',
    name,
    email: null,
    gender,
    birth_year: birthYear,
    height_cm: height,
    weight_kg: weight,
    activity_level: activityLevel,
    goal,
    calorie_target: 2000,
    protein_target_g: 150,
    carbs_target_g: 250,
    fat_target_g: 65,
    xp: 0,
    level: 1,
    streak_days: 0,
    last_log_date: null,
    onboarding_done: false,
    target_weight_kg: goal !== 'maintain' ? targetWeight : null,
    password_hash: null,
    is_admin: false,
    is_banned: false,
    created_at: new Date().toISOString(),
  }

  const targets = calculateTargets(
    previewProfile,
    goal !== 'maintain' ? targetWeight : null,
    goal !== 'maintain' ? timeframeWeeks : null
  )

  const handleFinish = async () => {
    setLoading(true)
    setError(null)
    try {
      await updateProfile({
        name,
        gender,
        birth_year: birthYear,
        height_cm: height,
        weight_kg: weight,
        activity_level: activityLevel,
        goal,
        target_weight_kg: goal !== 'maintain' ? targetWeight : null,
        calorie_target: targets.calories,
        protein_target_g: targets.protein,
        carbs_target_g: targets.carbs,
        fat_target_g: targets.fat,
        onboarding_done: true,
      })
      navigate('/diary')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col px-6 py-10 max-w-sm mx-auto">
      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              s <= step ? 'bg-green-500' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Name + Gender */}
      {step === 1 && (
        <div className="flex-1 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Willkommen! 👋</h2>
            <p className="text-slate-400">Erzähl uns etwas über dich</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Dein Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Geschlecht</label>
            <div className="grid grid-cols-2 gap-2">
              {([['male', 'Männlich', '♂'], ['female', 'Weiblich', '♀']] as const).map(
                ([val, lbl, icon]) => (
                  <button
                    key={val}
                    onClick={() => setGender(val)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                      gender === val
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="block text-lg">{icon}</span>
                    {lbl}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Age + Height + Weight */}
      {step === 2 && (
        <div className="flex-1 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Körperdaten</h2>
            <p className="text-slate-400">Für eine genaue Kalkulation</p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Geburtsjahr</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(parseInt(e.target.value) || 1990)}
                min={1940}
                max={new Date().getFullYear() - 10}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Größe: <span className="text-slate-100 font-semibold">{height} cm</span>
              </label>
              <input
                type="range"
                min={140}
                max={220}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full accent-green-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Gewicht: <span className="text-slate-100 font-semibold">{weight} kg</span>
              </label>
              <input
                type="range"
                min={30}
                max={200}
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value))}
                className="w-full accent-green-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Activity level */}
      {step === 3 && (
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Aktivitätslevel</h2>
            <p className="text-slate-400">Wie aktiv bist du im Alltag?</p>
          </div>

          <div className="flex flex-col gap-2">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActivityLevel(opt.value as Profile['activity_level'])}
                className={`flex items-center gap-3 p-4 rounded-xl text-left transition-colors ${
                  activityLevel === opt.value
                    ? 'bg-green-500/20 border border-green-500'
                    : 'bg-slate-800 border border-transparent hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${
                    activityLevel === opt.value ? 'bg-green-500 border-green-500' : 'border-slate-500'
                  }`}
                />
                <div>
                  <p className="font-medium text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Goal + targets */}
      {step === 4 && (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Dein Ziel</h2>
            <p className="text-slate-400">Was möchtest du erreichen?</p>
          </div>

          {/* Goal selector */}
          <div className="flex gap-2">
            {(
              [
                { value: 'lose', label: 'Abnehmen', emoji: '📉' },
                { value: 'maintain', label: 'Halten', emoji: '⚖️' },
                { value: 'gain', label: 'Zunehmen', emoji: '📈' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  goal === opt.value
                    ? 'bg-green-500/20 border border-green-500 text-green-400'
                    : 'bg-slate-800 border border-transparent hover:border-slate-600 text-slate-300'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Target weight + timeframe */}
          {goal !== 'maintain' && (
            <div className="flex flex-col gap-4 bg-slate-800 rounded-2xl p-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Aktuelles Gewicht: <span className="text-slate-100 font-semibold">{weight} kg</span>
                </label>
                <label className="block text-sm text-slate-400 mb-1.5 mt-3">
                  Zielgewicht: <span className="text-slate-100 font-semibold">{targetWeight} kg</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={200}
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Zeitrahmen</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIMEFRAME_OPTIONS.map((opt) => (
                    <button
                      key={opt.weeks}
                      onClick={() => setTimeframeWeeks(opt.weeks)}
                      className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                        timeframeWeeks === opt.weeks
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live calculation */}
              {deficitInfo && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Differenz:</span>
                    <span className="text-slate-100 font-semibold">{deficitInfo.kgDiff} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      Benötigtes Tages{goal === 'lose' ? 'defizit' : 'überschuss'}:
                    </span>
                    <span className="text-slate-100 font-semibold">{deficitInfo.kcalPerDay} kcal</span>
                  </div>
                  {deficitInfo.isCapped && (
                    <p className="text-xs text-amber-400">
                      Auf {deficitInfo.cappedKcal} kcal begrenzt (gesünder)
                    </p>
                  )}
                  {deficitInfo.intensity === 'aggressive' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">
                      <p className="text-red-400 text-xs">⚠️ Sehr aggressiv — empfohlen: max. 1kg/Woche</p>
                    </div>
                  )}
                  {deficitInfo.intensity === 'ambitious' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                      <p className="text-amber-400 text-xs">Ambitioniert — machbar mit Disziplin</p>
                    </div>
                  )}
                  {deficitInfo.intensity === 'healthy' && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2.5">
                      <p className="text-green-400 text-xs">Gesund & nachhaltig ✓</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Calculated targets */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-400 mb-3">Dein tägliches Kalorienziel:</p>
            <p className="text-4xl font-bold text-green-400 mb-3">{targets.calories} kcal</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-700 rounded-xl p-2">
                <p className="text-lg font-bold text-slate-100">{targets.protein}g</p>
                <p className="text-[10px] text-slate-400">Eiweiß</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-2">
                <p className="text-lg font-bold text-slate-100">{targets.carbs}g</p>
                <p className="text-[10px] text-slate-400">Kohlenhydrate</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-2">
                <p className="text-lg font-bold text-slate-100">{targets.fat}g</p>
                <p className="text-[10px] text-slate-400">Fett</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex items-center gap-1 px-4 py-3 bg-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-600 transition-colors"
          >
            <ChevronLeft size={18} />
            Zurück
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="flex-1 flex items-center justify-center gap-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            Weiter
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={loading}
            className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Loslegen! 🚀'}
          </button>
        )}
      </div>
    </div>
  )
}
