import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDailyLog } from '../hooks/useDailyLog'
import Layout from '../components/Layout'
import FoodSearch from '../components/FoodSearch'
import PortionSelector from '../components/PortionSelector'
import { api } from '../lib/api'
import type { Meal, MealIngredient, MealType, FoodItem, MealShare } from '../types'
import { MEAL_TYPE_LABELS } from '../types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronRight, Trash2, UtensilsCrossed, X, Share2, User } from 'lucide-react'
import { calculateNutrition } from '../lib/nutrition'

const today = new Date().toISOString().split('T')[0]
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

type View = 'list' | 'create' | 'detail'

export default function MealsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addEntry } = useDailyLog(user?.id, today)
  const navigate = useNavigate()

  const [view, setView] = useState<View>('list')
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [newMealName, setNewMealName] = useState('')
  const [newMealDesc, setNewMealDesc] = useState('')
  const [pendingIngredients, setPendingIngredients] = useState<MealIngredient[]>([])
  const [addingFood, setAddingFood] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [logMealType, setLogMealType] = useState<MealType>('lunch')
  const [logSuccess, setLogSuccess] = useState(false)

  // Share modal state
  const [shareModalMeal, setShareModalMeal] = useState<Meal | null>(null)
  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([])
  const [shareSaving, setShareSaving] = useState(false)

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ['meals', user?.id],
    queryFn: async () => {
      if (!user) return []
      return api.get('/meals') as Promise<Meal[]>
    },
    enabled: !!user,
  })

  const { data: shareableUsers = [] } = useQuery({
    queryKey: ['shareable-users'],
    queryFn: async () => {
      if (!user) return []
      return api.get('/meals/shareable-users') as Promise<MealShare[]>
    },
    enabled: !!shareModalMeal,
  })

  const openShareModal = (meal: Meal, e: React.MouseEvent) => {
    e.stopPropagation()
    setShareModalMeal(meal)
    setSelectedShareIds((meal.shares ?? []).map(s => s.id))
  }

  const closeShareModal = () => {
    setShareModalMeal(null)
    setSelectedShareIds([])
  }

  const handleSaveShares = async () => {
    if (!shareModalMeal) return
    setShareSaving(true)
    try {
      const previousIds = (shareModalMeal.shares ?? []).map(s => s.id)
      const toAdd = selectedShareIds.filter(id => !previousIds.includes(id))
      const toRemove = previousIds.filter(id => !selectedShareIds.includes(id))

      if (toAdd.length > 0) {
        await api.post(`/meals/${shareModalMeal.id}/share`, { user_ids: toAdd })
      }
      for (const userId of toRemove) {
        await api.del(`/meals/${shareModalMeal.id}/share/${userId}`)
      }

      queryClient.invalidateQueries({ queryKey: ['meals'] })
      closeShareModal()
    } finally {
      setShareSaving(false)
    }
  }

  const handleAddIngredient = (food: FoodItem) => {
    setSelectedFood(food)
    setAddingFood(false)
  }

  const handleConfirmIngredient = (amountGrams: number, portionLabel: string) => {
    if (!selectedFood) return
    const nutrition = calculateNutrition(
      selectedFood.calories_per_100g,
      selectedFood.protein_per_100g,
      selectedFood.carbs_per_100g,
      selectedFood.fat_per_100g,
      selectedFood.fiber_per_100g,
      amountGrams
    )
    const ingredient: MealIngredient = {
      id: String(Date.now()),
      meal_id: '',
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      food_brand: selectedFood.brand ?? null,
      amount_grams: amountGrams,
      portion_label: portionLabel,
      calories_per_100g: selectedFood.calories_per_100g,
      protein_per_100g: selectedFood.protein_per_100g,
      carbs_per_100g: selectedFood.carbs_per_100g,
      fat_per_100g: selectedFood.fat_per_100g,
      fiber_per_100g: selectedFood.fiber_per_100g,
      ...nutrition,
    }
    setPendingIngredients((prev) => [...prev, ingredient])
    setSelectedFood(null)
  }

  const removeIngredient = (id: string) => {
    setPendingIngredients((prev) => prev.filter((i) => i.id !== id))
  }

  const totalNutrition = pendingIngredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
      fiber_g: acc.fiber_g + i.fiber_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  )

  const handleSaveMeal = async () => {
    if (!user || !newMealName.trim() || pendingIngredients.length === 0) return
    setSaving(true)
    try {
      await api.post('/meals', {
        name: newMealName.trim(),
        total_calories: totalNutrition.calories,
        total_protein_g: totalNutrition.protein_g,
        total_carbs_g: totalNutrition.carbs_g,
        total_fat_g: totalNutrition.fat_g,
        ingredients: pendingIngredients,
      })

      queryClient.invalidateQueries({ queryKey: ['meals'] })
      setNewMealName('')
      setNewMealDesc('')
      setPendingIngredients([])
      setView('list')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    await api.del(`/meals/${mealId}`)
    queryClient.invalidateQueries({ queryKey: ['meals'] })
    setView('list')
    setSelectedMeal(null)
  }

  const handleLogMeal = async () => {
    if (!selectedMeal?.ingredients || !user) return

    for (const ing of selectedMeal.ingredients) {
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
      await addEntry(food, ing.amount_grams, ing.portion_label ?? `${ing.amount_grams}g`, logMealType)
    }
    setLogSuccess(true)
    setTimeout(() => {
      setLogSuccess(false)
      navigate('/diary')
    }, 1500)
  }

  return (
    <Layout title="Meine Gerichte" showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {view === 'list' && (
          <>
            <button
              onClick={() => setView('create')}
              className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-green-500/40 rounded-2xl text-green-400 font-semibold hover:border-green-500 hover:bg-green-500/5 transition-colors"
            >
              <Plus size={18} />
              Neues Gericht erstellen
            </button>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : meals.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Noch keine Gerichte gespeichert</p>
              </div>
            ) : (
              meals.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => { setSelectedMeal(meal); setView('detail') }}
                  className="flex items-center gap-3 p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed size={20} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100">{meal.name}</p>
                    <p className="text-xs text-slate-400">
                      {meal.ingredients?.length ?? 0} Zutaten • {Math.round(Number(meal.total_calories))} kcal
                    </p>
                    {meal.is_shared_with_me && meal.owner_name && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <User size={10} />
                        Von: {meal.owner_name}
                      </p>
                    )}
                    {!meal.is_shared_with_me && (meal.shares ?? []).length > 0 && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Share2 size={10} />
                        Geteilt mit: {meal.shares!.map(s => s.name ?? s.email ?? '').join(', ')}
                      </p>
                    )}
                  </div>
                  {!meal.is_shared_with_me && (
                    <button
                      onClick={(e) => openShareModal(meal, e)}
                      className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Teilen"
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              ))
            )}
          </>
        )}

        {view === 'create' && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-100">
                <X size={20} />
              </button>
              <h3 className="font-semibold text-slate-100">Neues Gericht</h3>
            </div>

            <input
              type="text"
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              placeholder="Name des Gerichts"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
            />
            <input
              type="text"
              value={newMealDesc}
              onChange={(e) => setNewMealDesc(e.target.value)}
              placeholder="Beschreibung (optional)"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
            />

            {/* Ingredients list */}
            {pendingIngredients.length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-slate-300">Zutaten</h4>
                {pendingIngredients.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-100">{ing.food_name}</p>
                      <p className="text-xs text-slate-400">{ing.portion_label ?? `${ing.amount_grams}g`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-green-400">{Math.round(ing.calories)} kcal</p>
                      <button onClick={() => removeIngredient(ing.id)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                  <span className="text-slate-400">Gesamt</span>
                  <span className="font-semibold text-green-400">{Math.round(totalNutrition.calories)} kcal</span>
                </div>
              </div>
            )}

            {selectedFood ? (
              <PortionSelector
                food={selectedFood}
                onConfirm={handleConfirmIngredient}
                onCancel={() => setSelectedFood(null)}
              />
            ) : addingFood ? (
              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-300">Zutat suchen</h4>
                  <button onClick={() => setAddingFood(false)} className="text-slate-400">
                    <X size={16} />
                  </button>
                </div>
                <FoodSearch onSelect={handleAddIngredient} autoFocus />
              </div>
            ) : (
              <button
                onClick={() => setAddingFood(true)}
                className="flex items-center justify-center gap-2 py-3 bg-slate-800 rounded-xl text-green-400 font-medium hover:bg-slate-700 transition-colors border border-dashed border-green-500/30"
              >
                <Plus size={16} />
                Zutat hinzufügen
              </button>
            )}

            <button
              onClick={handleSaveMeal}
              disabled={saving || !newMealName.trim() || pendingIngredients.length === 0}
              className="py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Gericht speichern'}
            </button>
          </>
        )}

        {view === 'detail' && selectedMeal && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-100">
                ← Zurück
              </button>
              <h3 className="font-semibold text-slate-100 flex-1">{selectedMeal.name}</h3>
              {!selectedMeal.is_shared_with_me && (
                <button
                  onClick={() => handleDeleteMeal(selectedMeal.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Nutrition summary */}
            <div className="bg-slate-800 rounded-2xl p-4 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-green-400">{Math.round(Number(selectedMeal.total_calories))}</p>
                <p className="text-[10px] text-slate-400">kcal</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-100">{Number(selectedMeal.total_protein_g).toFixed(0)}</p>
                <p className="text-[10px] text-slate-400">Eiweiß g</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-100">{Number(selectedMeal.total_carbs_g).toFixed(0)}</p>
                <p className="text-[10px] text-slate-400">Kohlenhydr. g</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-100">{Number(selectedMeal.total_fat_g).toFixed(0)}</p>
                <p className="text-[10px] text-slate-400">Fett g</p>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Zutaten</h4>
              {(selectedMeal.ingredients ?? []).map((ing) => (
                <div key={ing.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div>
                    <p className="text-sm text-slate-100">{ing.food_name}</p>
                    <p className="text-xs text-slate-400">{ing.portion_label ?? `${ing.amount_grams}g`}</p>
                  </div>
                  <p className="text-sm text-green-400">{Math.round(Number(ing.calories))} kcal</p>
                </div>
              ))}
            </div>

            {/* Log to diary */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">In Tagebuch eintragen</h4>
              <div className="flex gap-2">
                <select
                  value={logMealType}
                  onChange={(e) => setLogMealType(e.target.value as MealType)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-green-500 text-sm"
                >
                  {MEAL_TYPES.map((m) => (
                    <option key={m} value={m}>{MEAL_TYPE_LABELS[m]}</option>
                  ))}
                </select>
                <button
                  onClick={handleLogMeal}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    logSuccess ? 'bg-green-600 text-white' : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {logSuccess ? 'Eingetragen!' : 'Eintragen'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Share Modal */}
      {shareModalMeal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">Rezept teilen</h3>
              <button onClick={closeShareModal} className="text-slate-400 hover:text-slate-100">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-400">„{shareModalMeal.name}" teilen mit:</p>

            {shareableUsers.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Keine anderen Benutzer gefunden</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {shareableUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedShareIds(prev => [...prev, u.id])
                        } else {
                          setSelectedShareIds(prev => prev.filter(id => id !== u.id))
                        }
                      }}
                      className="w-4 h-4 accent-green-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-100">{u.name ?? u.email}</p>
                      {u.name && <p className="text-xs text-slate-400">{u.email}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={handleSaveShares}
              disabled={shareSaving}
              className="py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {shareSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
