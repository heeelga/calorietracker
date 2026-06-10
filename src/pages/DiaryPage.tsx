import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDailyLog } from '../hooks/useDailyLog'
import Layout from '../components/Layout'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { MealType } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default function DiaryPage() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const navigate = useNavigate()

  const dateStr = formatDate(currentDate)
  const { entries, loading, deleteEntry, totals } = useDailyLog(user?.id, dateStr)

  const isToday = dateStr === formatDate(new Date())

  const dateLabel = currentDate.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Layout title="Tagebuch" showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Date navigation */}
        <div className="flex items-center justify-between bg-slate-800 rounded-2xl px-4 py-3">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-100">
              {isToday ? 'Heute' : dateLabel}
            </p>
            {!isToday && <p className="text-xs text-slate-400">{dateStr}</p>}
          </div>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            disabled={isToday}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Meal sections */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {MEAL_TYPES.map((mealType) => {
              const mealEntries = entries.filter((e) => e.meal_type === mealType)
              const mealCalories = mealEntries.reduce((s, e) => s + e.calories, 0)

              return (
                <div key={mealType} className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{MEAL_EMOJIS[mealType]}</span>
                      <h3 className="font-semibold text-slate-100">{MEAL_TYPE_LABELS[mealType]}</h3>
                      {mealCalories > 0 && (
                        <span className="text-xs text-slate-400">{Math.round(mealCalories)} kcal</span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/search?meal=${mealType}&date=${dateStr}`)}
                      className="flex items-center gap-1 text-xs text-green-400 font-medium hover:text-green-300 bg-green-500/10 rounded-lg px-2 py-1"
                    >
                      <Plus size={14} />
                      Hinzufügen
                    </button>
                  </div>

                  {mealEntries.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">Noch keine Einträge</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {mealEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between py-2 border-t border-slate-700/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-100 truncate">{entry.food_name}</p>
                            <p className="text-xs text-slate-400">
                              {entry.portion_label ?? `${entry.amount_grams}g`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-400">{Math.round(entry.calories)} kcal</p>
                              <p className="text-[10px] text-slate-400">
                                E:{entry.protein_g.toFixed(0)} K:{entry.carbs_g.toFixed(0)} F:{entry.fat_g.toFixed(0)}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Daily totals */}
            {entries.length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-4 border border-green-500/20">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Tagesübersicht</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-400">{Math.round(totals.calories)}</p>
                    <p className="text-[10px] text-slate-400">kcal</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-100">{totals.protein_g.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400">Eiweiß g</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-100">{totals.carbs_g.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400">Kohlenhydr. g</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-100">{totals.fat_g.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400">Fett g</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
