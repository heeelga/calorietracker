import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDailyLog } from '../hooks/useDailyLog'
import Layout from '../components/Layout'
import { ChevronLeft, ChevronRight, Plus, Trash2, X, UtensilsCrossed, User } from 'lucide-react'
import type { MealType, Meal, FoodItem } from '../types'
import { MEAL_TYPE_LABELS } from '../types'
import { api } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

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
  const { entries, loading, deleteEntry, totals, addEntry, refetch } = useDailyLog(user?.id, dateStr)

  const isToday = dateStr === formatDate(new Date())

  const dateLabel = currentDate.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Bottom sheet state
  const [addSheetMealType, setAddSheetMealType] = useState<MealType | null>(null)
  const [sheetMode, setSheetMode] = useState<'choose' | 'meal-picker'>('choose')
  const [mealPickerLogging, setMealPickerLogging] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', user?.id],
    queryFn: async () => {
      if (!user) return []
      return api.get('/meals') as Promise<Meal[]>
    },
    enabled: !!user && sheetMode === 'meal-picker',
  })

  const openAddSheet = (mealType: MealType) => {
    setAddSheetMealType(mealType)
    setSheetMode('choose')
  }

  const closeSheet = () => {
    setAddSheetMealType(null)
    setSheetMode('choose')
  }

  const handleLogMeal = async (meal: Meal) => {
    if (!meal.ingredients || meal.ingredients.length === 0) return
    setMealPickerLogging(meal.id)
    try {
      for (const ing of meal.ingredients) {
        const food: FoodItem = {
          id: ing.food_id ?? ing.id,
          name: ing.food_name,
          brand: ing.food_brand ?? undefined,
          calories_per_100g: ing.calories_per_100g,
          protein_per_100g: ing.protein_per_100g,
          carbs_per_100g: ing.carbs_per_100g,
          fat_per_100g: ing.fat_per_100g,
          fiber_per_100g: ing.fiber_per_100g,
          source: 'manual' as const,
        }
        await addEntry(food, ing.amount_grams, ing.portion_label ?? `${ing.amount_grams}g`, addSheetMealType!)
      }
      await refetch()
      closeSheet()
      setSuccessToast(`Rezept '${meal.name}' hinzugefügt`)
      setTimeout(() => setSuccessToast(null), 2500)
    } finally {
      setMealPickerLogging(null)
    }
  }

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
                      onClick={() => openAddSheet(mealType)}
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

      {/* Add bottom sheet */}
      {addSheetMealType && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={closeSheet}>
          <div
            className="bg-slate-800 rounded-t-2xl w-full max-w-md p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">
                {sheetMode === 'choose'
                  ? `${MEAL_TYPE_LABELS[addSheetMealType]} – Hinzufügen`
                  : 'Rezept auswählen'}
              </h3>
              <button onClick={closeSheet} className="text-slate-400 hover:text-slate-100">
                <X size={20} />
              </button>
            </div>

            {sheetMode === 'choose' && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    closeSheet()
                    navigate(`/search?meal=${addSheetMealType}&date=${dateStr}`)
                  }}
                  className="flex items-center gap-3 p-4 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors text-left"
                >
                  <span className="text-2xl">🔍</span>
                  <div>
                    <p className="font-semibold text-slate-100">Lebensmittel</p>
                    <p className="text-xs text-slate-400">Lebensmittel suchen und hinzufügen</p>
                  </div>
                </button>
                <button
                  onClick={() => setSheetMode('meal-picker')}
                  className="flex items-center gap-3 p-4 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors text-left"
                >
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <p className="font-semibold text-slate-100">Rezept</p>
                    <p className="text-xs text-slate-400">Gespeichertes Gericht hinzufügen</p>
                  </div>
                </button>
              </div>
            )}

            {sheetMode === 'meal-picker' && (
              <>
                <button
                  onClick={() => setSheetMode('choose')}
                  className="text-sm text-slate-400 hover:text-slate-200 self-start"
                >
                  ← Zurück
                </button>
                {meals.length === 0 ? (
                  <div className="text-center py-6">
                    <UtensilsCrossed size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Noch keine Gerichte gespeichert</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {meals.map((meal) => (
                      <button
                        key={meal.id}
                        onClick={() => handleLogMeal(meal)}
                        disabled={mealPickerLogging === meal.id}
                        className="flex items-center gap-3 p-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors text-left disabled:opacity-50"
                      >
                        <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed size={16} className="text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-100 text-sm">{meal.name}</p>
                          <p className="text-xs text-slate-400">
                            {Math.round(Number(meal.total_calories))} kcal
                            {meal.is_shared_with_me && meal.owner_name && (
                              <span className="ml-1 inline-flex items-center gap-0.5">
                                <User size={9} />
                                {meal.owner_name}
                              </span>
                            )}
                          </p>
                        </div>
                        {mealPickerLogging === meal.id && (
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap">
          {successToast}
        </div>
      )}
    </Layout>
  )
}
