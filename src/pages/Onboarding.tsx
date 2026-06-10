import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { calculateTargets } from '../lib/nutrition'
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

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Abnehmen', desc: '500 kcal Defizit', emoji: '📉' },
  { value: 'maintain', label: 'Gewicht halten', desc: 'Kein Defizit', emoji: '⚖️' },
  { value: 'gain', label: 'Zunehmen', desc: '300 kcal Überschuss', emoji: '📈' },
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
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other')
  const [birthYear, setBirthYear] = useState(1990)
  const [height, setHeight] = useState(170)
  const [weight, setWeight] = useState(70)
  const [activityLevel, setActivityLevel] = useState<Profile['activity_level']>('moderate')
  const [goal, setGoal] = useState<Profile['goal']>('maintain')

  const previewProfile: Profile = {
    id: user?.id ?? '',
    name,
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
    created_at: new Date().toISOString(),
  }
  const targets = calculateTargets(previewProfile)

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
            <div className="grid grid-cols-3 gap-2">
              {([['male', 'Männlich', '♂'], ['female', 'Weiblich', '♀'], ['other', 'Divers', '⚧']] as const).map(
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
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Dein Ziel</h2>
            <p className="text-slate-400">Was möchtest du erreichen?</p>
          </div>

          <div className="flex flex-col gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value as Profile['goal'])}
                className={`flex items-center gap-3 p-4 rounded-xl text-left transition-colors ${
                  goal === opt.value
                    ? 'bg-green-500/20 border border-green-500'
                    : 'bg-slate-800 border border-transparent hover:border-slate-600'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Calculated targets */}
          <div className="bg-slate-800 rounded-2xl p-4 mt-2">
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
