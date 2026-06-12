import { useState, useMemo, useEffect, useRef } from 'react'
import { calculateNutrition } from '../lib/nutrition'
import { detectPortionType } from '../data/portionSizes'
import type { FoodItem } from '../types'
import { X, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

interface PortionSelectorProps {
  food: FoodItem
  onConfirm: (amountGrams: number, portionLabel: string) => void
  onCancel: () => void
  defaultGrams?: number
}

type InputMode = 'grams' | 'pieces' | 'package'

export default function PortionSelector({ food, onConfirm, onCancel, defaultGrams }: PortionSelectorProps) {
  const portionData = detectPortionType(food.name)
  const hasPackage = !!food.package_weight_g && !!food.barcode

  // If a previous amount is known, always start in grams mode with that value pre-filled
  const defaultMode: InputMode = defaultGrams ? 'grams' : portionData ? 'pieces' : hasPackage ? 'package' : 'grams'
  const [mode, setMode] = useState<InputMode>(defaultMode)

  // Gram mode
  const [gramValue, setGramValue] = useState(defaultGrams ? String(defaultGrams) : '100')

  // Pieces mode
  const [quantity, setQuantity] = useState(1)
  const [sizeIndex, setSizeIndex] = useState(1) // default 'mittel'

  // Package mode
  const [packageFraction, setPackageFraction] = useState<'full' | 'half' | 'quarter' | 'custom'>('full')
  const [customGrams, setCustomGrams] = useState(String(food.package_weight_g ?? 100))

  const amountGrams = useMemo((): number => {
    if (mode === 'grams') {
      return parseFloat(gramValue) || 0
    }
    if (mode === 'pieces' && portionData) {
      const size = portionData.sizes[sizeIndex] ?? portionData.sizes[0]
      return quantity * size.grams
    }
    if (mode === 'package' && food.package_weight_g) {
      if (packageFraction === 'full') return food.package_weight_g
      if (packageFraction === 'half') return food.package_weight_g / 2
      if (packageFraction === 'quarter') return food.package_weight_g / 4
      return parseFloat(customGrams) || 0
    }
    return 0
  }, [mode, gramValue, quantity, sizeIndex, packageFraction, customGrams, portionData, food.package_weight_g])

  const nutrition = useMemo(
    () => calculateNutrition(
      food.calories_per_100g,
      food.protein_per_100g,
      food.carbs_per_100g,
      food.fat_per_100g,
      food.fiber_per_100g,
      amountGrams
    ),
    [food, amountGrams]
  )

  const portionLabel = useMemo((): string => {
    if (mode === 'grams') return `${Math.round(amountGrams)} g`
    if (mode === 'pieces' && portionData) {
      const size = portionData.sizes[sizeIndex]
      return `${quantity}× ${size?.label ?? ''} (${Math.round(amountGrams)} g)`
    }
    if (mode === 'package') {
      if (packageFraction === 'full') return `Ganzes Produkt (${Math.round(amountGrams)} g)`
      if (packageFraction === 'half') return `Halbes Produkt (${Math.round(amountGrams)} g)`
      if (packageFraction === 'quarter') return `Viertel Produkt (${Math.round(amountGrams)} g)`
      return `${Math.round(amountGrams)} g`
    }
    return `${Math.round(amountGrams)} g`
  }, [mode, amountGrams, portionData, sizeIndex, quantity, packageFraction])

  // AI portion validation (debounced, optional — fails silently if not configured)
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [aiChecking, setAiChecking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setAiHint(null)
    if (amountGrams <= 0) return

    debounceRef.current = setTimeout(async () => {
      setAiChecking(true)
      try {
        const result = await api.post('/ai/validate-portion', {
          food_name: food.name,
          amount_grams: Math.round(amountGrams),
          portion_label: portionLabel,
        }) as { ok: boolean; hint?: string }
        setAiHint(!result.ok && result.hint ? result.hint : null)
      } catch {
        // Fail silently
      } finally {
        setAiChecking(false)
      }
    }, 900)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [amountGrams, portionLabel, food.name])

  const availableModes: InputMode[] = ['grams']
  if (portionData) availableModes.push('pieces')
  if (hasPackage) availableModes.push('package')

  const modeLabels: Record<InputMode, string> = {
    grams: 'Gramm',
    pieces: `Stück (${portionData?.unit ?? ''})`,
    package: 'Packung',
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-100">{food.name}</h3>
          {food.brand && <p className="text-xs text-slate-400">{food.brand}</p>}
        </div>
        <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-100">
          <X size={18} />
        </button>
      </div>

      {/* Mode tabs */}
      {availableModes.length > 1 && (
        <div className="flex gap-1 bg-slate-700 rounded-xl p-1">
          {availableModes.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === m
                  ? 'bg-green-500 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      )}

      {/* Gram input */}
      {mode === 'grams' && (
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Menge in Gramm</label>
          <input
            type="number"
            value={gramValue}
            onChange={(e) => setGramValue(e.target.value)}
            min="1"
            max="9999"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 text-lg font-semibold focus:outline-none focus:border-green-500"
          />
        </div>
      )}

      {/* Pieces input */}
      {mode === 'pieces' && portionData && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Größe</label>
            <div className="flex gap-2">
              {portionData.sizes.map((size, i) => (
                <button
                  key={i}
                  onClick={() => setSizeIndex(i)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    sizeIndex === i
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {size.label}
                  <span className="block text-[10px] opacity-70">{size.grams}g</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Anzahl</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-xl bg-slate-700 text-slate-100 text-xl font-bold hover:bg-slate-600 transition-colors"
              >
                −
              </button>
              <span className="text-2xl font-bold text-slate-100 w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-xl bg-slate-700 text-slate-100 text-xl font-bold hover:bg-slate-600 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Package input */}
      {mode === 'package' && food.package_weight_g && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-slate-400">Packungsgröße: {food.package_weight_g}g</label>
          <div className="grid grid-cols-2 gap-2">
            {(['full', 'half', 'quarter'] as const).map((frac) => {
              const labels = { full: 'Ganzes Produkt', half: 'Halbes Produkt', quarter: 'Viertel' }
              const grams = {
                full: food.package_weight_g!,
                half: food.package_weight_g! / 2,
                quarter: food.package_weight_g! / 4,
              }
              return (
                <button
                  key={frac}
                  onClick={() => setPackageFraction(frac)}
                  className={`py-2 px-3 rounded-xl text-sm transition-colors ${
                    packageFraction === frac
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {labels[frac]}
                  <span className="block text-[10px] opacity-70">{grams[frac]}g</span>
                </button>
              )
            })}
            <button
              onClick={() => setPackageFraction('custom')}
              className={`py-2 px-3 rounded-xl text-sm transition-colors ${
                packageFraction === 'custom'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Eigene Menge
            </button>
          </div>
          {packageFraction === 'custom' && (
            <input
              type="number"
              value={customGrams}
              onChange={(e) => setCustomGrams(e.target.value)}
              placeholder="Gramm eingeben"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-green-500"
            />
          )}
        </div>
      )}

      {/* Preview */}
      <div className="bg-slate-700/50 rounded-xl p-3">
        <p className="text-xs text-slate-400 mb-2">Vorschau: {portionLabel}</p>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-base font-bold text-green-400">{Math.round(nutrition.calories)}</p>
            <p className="text-[10px] text-slate-400">kcal</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-100">{nutrition.protein_g.toFixed(1)}</p>
            <p className="text-[10px] text-slate-400">Eiweiß</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-100">{nutrition.carbs_g.toFixed(1)}</p>
            <p className="text-[10px] text-slate-400">Kohlenhydr.</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-100">{nutrition.fat_g.toFixed(1)}</p>
            <p className="text-[10px] text-slate-400">Fett</p>
          </div>
        </div>
      </div>

      {/* AI portion hint */}
      {aiChecking && (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Loader2 size={12} className="animate-spin" />
          Mengenangabe wird geprüft…
        </div>
      )}
      {!aiChecking && aiHint && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">{aiHint}</p>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={() => amountGrams > 0 && onConfirm(amountGrams, portionLabel)}
        disabled={amountGrams <= 0}
        className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check size={18} />
        Hinzufügen
      </button>
    </div>
  )
}
