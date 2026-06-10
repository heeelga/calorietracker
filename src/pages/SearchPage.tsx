import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDailyLog } from '../hooks/useDailyLog'
import { useProfile } from '../hooks/useProfile'
import { useRewards } from '../hooks/useRewards'
import FoodSearch from '../components/FoodSearch'
import BarcodeScanner from '../components/BarcodeScanner'
import PortionSelector from '../components/PortionSelector'
import Layout from '../components/Layout'
import { getFoodByBarcode } from '../lib/openfoodfacts'
import { db } from '../lib/db'
import type { FoodItem, MealType, FavoriteFood } from '../types'
import { useQuery } from '@tanstack/react-query'
import { Camera, Heart, ChefHat, Loader2 } from 'lucide-react'

type Tab = 'search' | 'favorites' | 'custom'

const today = new Date().toISOString().split('T')[0]

export default function SearchPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const mealType = (searchParams.get('meal') ?? 'snack') as MealType
  const dateParam = searchParams.get('date') ?? today
  const navigate = useNavigate()

  const { addEntry } = useDailyLog(user?.id, dateParam)
  const { profile, updateProfile } = useProfile(user?.id)
  const { updateStreak, awardXP, checkAndAwardBadges, getEarnedBadges } = useRewards(user?.id)

  const [tab, setTab] = useState<Tab>('search')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return []
      return db.favorites.where('user_id').equals(user.id).toArray()
    },
    enabled: !!user,
  })

  // custom_foods is not in Dexie schema; show empty list
  const customFoods: FoodItem[] = []

  const handleScan = async (barcode: string) => {
    setShowScanner(false)
    setScanLoading(true)
    setScanError(null)
    try {
      const food = await getFoodByBarcode(barcode)
      if (food) {
        setSelectedFood(food)
        setTab('search')
      } else {
        setScanError(`Produkt mit Barcode ${barcode} nicht gefunden.`)
      }
    } catch {
      setScanError('Fehler beim Barcode-Lookup.')
    } finally {
      setScanLoading(false)
    }
  }

  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food)
  }

  const handleFavoriteFood = (fav: FavoriteFood): FoodItem => ({
    id: fav.food_id ?? fav.id,
    name: fav.food_name,
    brand: fav.food_brand ?? undefined,
    calories_per_100g: fav.calories_per_100g,
    protein_per_100g: fav.protein_per_100g,
    carbs_per_100g: fav.carbs_per_100g,
    fat_per_100g: fav.fat_per_100g,
    fiber_per_100g: fav.fiber_per_100g,
    barcode: fav.barcode ?? undefined,
    package_weight_g: fav.package_weight_g ?? undefined,
    image_url: fav.image_url ?? undefined,
    source: 'manual' as const,
  })

  const handleConfirmPortion = async (amountGrams: number, portionLabel: string) => {
    if (!selectedFood || !user) return

    try {
      await addEntry(selectedFood, amountGrams, portionLabel, mealType)

      // Save to favorites if not already there
      const alreadyFav = favorites.some((f) => f.food_id === selectedFood.id)
      if (!alreadyFav) {
        await db.favorites.add({
          id: crypto.randomUUID(),
          user_id: user.id,
          food_id: selectedFood.id,
          food_name: selectedFood.name,
          food_brand: selectedFood.brand ?? null,
          calories_per_100g: selectedFood.calories_per_100g,
          protein_per_100g: selectedFood.protein_per_100g,
          carbs_per_100g: selectedFood.carbs_per_100g,
          fat_per_100g: selectedFood.fat_per_100g,
          fiber_per_100g: selectedFood.fiber_per_100g,
          barcode: selectedFood.barcode ?? null,
          package_weight_g: selectedFood.package_weight_g ?? null,
          image_url: selectedFood.image_url ?? null,
          created_at: new Date().toISOString(),
        })
        refetchFavorites()
      }

      // Rewards
      if (profile) {
        const streakUpdates = await updateStreak(profile)
        const xpUpdates = await awardXP({ ...profile, ...streakUpdates })
        const updatedProfile = { ...profile, ...streakUpdates, ...xpUpdates }

        const count = await db.log_entries.where('user_id').equals(user.id).count()

        const earnedKeys = await getEarnedBadges()
        await checkAndAwardBadges(updatedProfile, earnedKeys, count)
        await updateProfile({ ...streakUpdates, ...xpUpdates })
      }

      navigate(-1)
    } catch (err) {
      console.error('Fehler beim Hinzufügen:', err)
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'search', label: 'Suche', icon: null },
    { key: 'favorites', label: 'Favoriten', icon: <Heart size={12} /> },
    { key: 'custom', label: 'Eigene', icon: <ChefHat size={12} /> },
  ]

  return (
    <Layout showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-slate-200">
            ← Zurück
          </button>
          <h2 className="font-semibold text-slate-100">Lebensmittel hinzufügen</h2>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 text-sm text-green-400 font-medium hover:text-green-300"
          >
            <Camera size={16} />
            Scan
          </button>
        </div>

        {/* Scan loading/error */}
        {scanLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Produkt wird geladen...
          </div>
        )}
        {scanError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-red-400 text-sm">{scanError}</p>
          </div>
        )}

        {/* Portion selector overlay */}
        {selectedFood && (
          <PortionSelector
            food={selectedFood}
            onConfirm={handleConfirmPortion}
            onCancel={() => setSelectedFood(null)}
          />
        )}

        {/* Tabs */}
        {!selectedFood && (
          <>
            <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
              {tabs.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    tab === key
                      ? 'bg-green-500 text-white'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {tab === 'search' && (
              <FoodSearch onSelect={handleFoodSelect} autoFocus />
            )}

            {tab === 'favorites' && (
              <div className="flex flex-col gap-2">
                {favorites.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">
                    Noch keine Favoriten. Lebensmittel werden automatisch gespeichert.
                  </p>
                ) : (
                  favorites.map((fav) => (
                    <button
                      key={fav.id}
                      onClick={() => handleFoodSelect(handleFavoriteFood(fav))}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-left"
                    >
                      <Heart size={16} className="text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{fav.food_name}</p>
                        {fav.food_brand && (
                          <p className="text-xs text-slate-400">{fav.food_brand}</p>
                        )}
                      </div>
                      <p className="text-xs text-green-400 font-medium flex-shrink-0">
                        {fav.calories_per_100g} kcal/100g
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {tab === 'custom' && (
              <div className="flex flex-col gap-2">
                {customFoods.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">
                    Noch keine eigenen Lebensmittel.
                  </p>
                ) : (
                  customFoods.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => handleFoodSelect(food)}
                      className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-left"
                    >
                      <ChefHat size={16} className="text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{food.name}</p>
                        {food.brand && (
                          <p className="text-xs text-slate-400">{food.brand}</p>
                        )}
                      </div>
                      <p className="text-xs text-green-400 font-medium flex-shrink-0">
                        {food.calories_per_100g} kcal/100g
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Barcode scanner */}
        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </Layout>
  )
}
