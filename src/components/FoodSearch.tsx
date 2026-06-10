import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { searchFoods } from '../lib/openfoodfacts'
import type { FoodItem } from '../types'

interface FoodSearchProps {
  onSelect: (food: FoodItem) => void
  placeholder?: string
  autoFocus?: boolean
}

export default function FoodSearch({
  onSelect,
  placeholder = 'Lebensmittel suchen...',
  autoFocus = false,
}: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await searchFoods(query)
        setResults(items)
      } catch {
        setError('Suche fehlgeschlagen. Bitte erneut versuchen.')
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

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
        <p className="text-red-400 text-sm px-1">{error}</p>
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

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-4">
          Keine Ergebnisse für „{query}"
        </p>
      )}
    </div>
  )
}
