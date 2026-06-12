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
import { api } from '../lib/api'
import type { FoodItem, MealType, FavoriteFood } from '../types'
import { useQuery } from '@tanstack/react-query'
import { Camera, Heart, Loader2, Clock } from 'lucide-react'
import { useBadgeNotification } from '../contexts/BadgeNotificationContext'

type Tab = 'search' | 'recent' | 'pinned'

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
  const { showBadge } = useBadgeNotification()

  const [tab, setTab] = useState<Tab>('search')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [selectedFoodDefaultGrams, setSelectedFoodDefaultGrams] = useState<number | undefined>(undefined)
  const [scannedFood, setScannedFood] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return []
      return api.get('/favorites') as Promise<FavoriteFood[]>
    },
    enabled: !!user,
  })

  const togglePin = async (fav: FavoriteFood, e: React.MouseEvent) => {
    e.stopPropagation()
    await api.put(`/favorites/${fav.id}/pin`, {})
    refetchFavorites()
  }

  const handleScan = async (barcode: string) => {
    setShowScanner(false)
    setScanLoading(true)
    setScanError(null)
    try {
      const food = await getFoodByBarcode(barcode)
      if (food) {
        setSelectedFood(food)
        setScannedFood(true)
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

  const handleFoodSelect = (food: FoodItem, defaultGrams?: number) => {
    setSelectedFood(food)
    setSelectedFoodDefaultGrams(defaultGrams)
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

      // Save/update favorite with last used amount
      await api.post('/favorites', {
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
        last_amount_grams: amountGrams,
      })
      refetchFavorites()

      // Rewards
      if (profile) {
        const streakUpdates = await updateStreak(profile)
        const xpUpdates = await awardXP({ ...profile, ...streakUpdates })
        const updatedProfile = { ...profile, ...streakUpdates, ...xpUpdates }

        const countData = await api.get('/log/count')
        const count = countData.count

        const earnedKeys = await getEarnedBadges()
        const newBadges = await checkAndAwardBadges(updatedProfile, earnedKeys, count, { barcodeScanned: scannedFood })
        setScannedFood(false)
        for (const badge of newBadges) {
          showBadge(badge)
        }
        await updateProfile({ ...streakUpdates, ...xpUpdates })
      }

      navigate(-1)
    } catch (err) {
      console.error('Fehler beim Hinzufügen:', err)
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'search', label: 'Suche', icon: null },
    { key: 'recent', label: 'Zuletzt', icon: <Clock size={12} /> },
    { key: 'pinned', label: 'Favoriten', icon: <Heart size={12} /> },
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
            onCancel={() => { setSelectedFood(null); setSelectedFoodDefaultGrams(undefined) }}
            defaultGrams={selectedFoodDefaultGrams}
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

            {(tab === 'recent' || tab === 'pinned') && (
              <div className="flex flex-col gap-2">
                {(() => {
                  const list = tab === 'pinned' ? favorites.filter(f => f.is_favorite) : favorites
                  if (list.length === 0) return (
                    <p className="text-slate-400 text-sm text-center py-8">
                      {tab === 'pinned' ? 'Noch keine Favoriten. Tippe auf das Herz um ein Lebensmittel zu merken.' : 'Noch keine Einträge.'}
                    </p>
                  )
                  return list.map((fav) => (
                    <div key={fav.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                      <button
                        onClick={(e) => togglePin(fav, e)}
                        className="flex-shrink-0 p-1 -m-1"
                      >
                        <Heart
                          size={16}
                          className={fav.is_favorite ? 'text-red-400 fill-red-400' : 'text-slate-500'}
                          fill={fav.is_favorite ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button
                        onClick={() => handleFoodSelect(handleFavoriteFood(fav), fav.last_amount_grams ?? undefined)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-slate-100 truncate">{fav.food_name}</p>
                        {fav.food_brand && (
                          <p className="text-xs text-slate-400">{fav.food_brand}</p>
                        )}
                      </button>
                      <span className="text-xs text-green-400 font-medium flex-shrink-0">
                        {Math.round(Number(fav.calories_per_100g))} kcal/100g
                      </span>
                    </div>
                  ))
                })()}
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
