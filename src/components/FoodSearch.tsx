import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, PenLine, X } from 'lucide-react'
import { searchFoods } from '../lib/openfoodfacts'
import type { FoodItem } from '../types'

interface FoodSearchProps {
  onSelect: (food: FoodItem) => void
  placeholder?: string
  autoFocus?: boolean
}

interface ManualFood {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

const emptyManual: ManualFood = { name: '', calories: '', protein: '', carbs: '', fat: '' }

export default function FoodSearch({
  onSelect,
  placeholder = 'Lebensmittel suchen...',
  autoFocus = false,
}: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState<ManualFood>(emptyManual)
  const [manualError, setManualError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      setIsNetworkError(false)
      return
    }

    setLoading(true)
    setError(null)
    setIsNetworkError(false)

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchFoods(query)
        setResults(items)
      } catch (err) {
        const netErr =
          err instanceof TypeError &&
          (err.message.toLowerCase().includes('netzwerk') ||
            err.message.toLowerCase().includes('network') ||
            err.message.toLowerCase().includes('fetch'))
        setIsNetworkError(netErr)
        setError(
          netErr
            ? 'Netzwerkfehler — prüfe deine Internetverbindung'
            : 'Suche fehlgeschlagen. Bitte erneut versuchen.'
        )
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setManualError(null)
    if (!manual.name.trim()) {
      setManualError('Bitte einen Namen eingeben')
      return
    }
    const calories = parseFloat(manual.calories)
    if (isNaN(calories) || calories < 0) {
      setManualError('Bitte gültige Kalorien eingeben')
      return
    }
    const food: FoodItem = {
      id: `manual-${Date.now()}`,
      name: manual.name.trim(),
      calories_per_100g: calories,
      protein_per_100g: parseFloat(manual.protein) || 0,
      carbs_per_100g: parseFloat(manual.carbs) || 0,
      fat_per_100g: parseFloat(manual.fat) || 0,
      fiber_per_100g: 0,
      source: 'manual',
    }
    setManual(emptyManual)
    setShowManual(false)
    onSelect(food)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-spin" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={`rounded-xl p-3 text-sm ${isNetworkError ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'text-red-400'}`}>
          {isNetworkError && <span className="font-semibold">Offline: </span>}
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => onSelect(food)}
              className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-left"
            >
              {food.image_url ? (
                <img
                  src={food.image_url}
                  alt={food.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🍽️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{food.name}</p>
                {food.brand && (
                  <p className="text-xs text-slate-400 truncate">{food.brand}</p>
                )}
                <p className="text-xs text-green-400 font-medium">
                  {food.calories_per_100g} kcal/100g
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400">E: {food.protein_per_100g}g</p>
                <p className="text-xs text-slate-400">K: {food.carbs_per_100g}g</p>
                <p className="text-xs text-slate-400">F: {food.fat_per_100g}g</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && !error && (
        <p className="text-slate-400 text-sm text-center py-4">
          Keine Ergebnisse für „{query}"
        </p>
      )}

      {/* Manual entry section */}
      {!showManual ? (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="flex items-center justify-center gap-2 mt-1 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-xl transition-colors"
        >
          <PenLine size={14} />
          Direkte Eingabe
        </button>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-100">Manuell eingeben</p>
            <button
              type="button"
              onClick={() => { setShowManual(false); setManual(emptyManual); setManualError(null) }}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={manual.name}
              onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
              placeholder="Lebensmittelname *"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kalorien/100g *</label>
                <input
                  type="number"
                  value={manual.calories}
                  onChange={(e) => setManual((m) => ({ ...m, calories: e.target.value }))}
                  placeholder="z.B. 250"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Eiweiß/100g</label>
                <input
                  type="number"
                  value={manual.protein}
                  onChange={(e) => setManual((m) => ({ ...m, protein: e.target.value }))}
                  placeholder="g"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kohlenhydrate/100g</label>
                <input
                  type="number"
                  value={manual.carbs}
                  onChange={(e) => setManual((m) => ({ ...m, carbs: e.target.value }))}
                  placeholder="g"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fett/100g</label>
                <input
                  type="number"
                  value={manual.fat}
                  onChange={(e) => setManual((m) => ({ ...m, fat: e.target.value }))}
                  placeholder="g"
                  min="0"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
            </div>
            {manualError && (
              <p className="text-red-400 text-xs">{manualError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors text-sm mt-1"
            >
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
