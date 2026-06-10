import type { FoodItem } from '../types'

const BASE_URL = 'https://world.openfoodfacts.org'
const BASE_URL_MIRROR = 'https://world.openfoodfacts.net'
const SEARCH_URL = `${BASE_URL}/cgi/search.pl`
const SEARCH_URL_MIRROR = `${BASE_URL_MIRROR}/cgi/search.pl`

const FETCH_TIMEOUT_MS = 5000

interface OFFProduct {
  id?: string
  _id?: string
  code?: string
  product_name?: string
  product_name_de?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    'energy-kcal'?: number
    energy_100g?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
    fiber_100g?: number
  }
  image_front_small_url?: string
  image_url?: string
  quantity?: string
}

interface UPCItemDBItem {
  title?: string
  brand?: string
  description?: string
  images?: string[]
  offers?: Array<{ price?: string }>
}

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout ? AbortSignal.timeout(ms) : (() => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), ms)
    return controller.signal
  })()
}

function parseWeight(quantityStr?: string): number | undefined {
  if (!quantityStr) return undefined
  const match = quantityStr.match(/(\d+(?:[.,]\d+)?)\s*g/i)
  if (match) {
    return parseFloat(match[1].replace(',', '.'))
  }
  const kgMatch = quantityStr.match(/(\d+(?:[.,]\d+)?)\s*kg/i)
  if (kgMatch) {
    return parseFloat(kgMatch[1].replace(',', '.')) * 1000
  }
  return undefined
}

function normalizeProduct(product: OFFProduct): FoodItem | null {
  const name = product.product_name_de || product.product_name
  if (!name) return null

  const nutriments = product.nutriments || {}
  const calories =
    nutriments['energy-kcal_100g'] ??
    nutriments['energy-kcal'] ??
    (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : 0)

  return {
    id: product._id || product.code || String(Math.random()),
    name: name.trim(),
    brand: product.brands?.split(',')[0]?.trim(),
    calories_per_100g: Math.round((calories ?? 0) * 10) / 10,
    protein_per_100g: Math.round((nutriments.proteins_100g ?? 0) * 10) / 10,
    carbs_per_100g: Math.round((nutriments.carbohydrates_100g ?? 0) * 10) / 10,
    fat_per_100g: Math.round((nutriments.fat_100g ?? 0) * 10) / 10,
    fiber_per_100g: Math.round((nutriments.fiber_100g ?? 0) * 10) / 10,
    image_url: product.image_front_small_url || product.image_url,
    barcode: product.code || product._id,
    package_weight_g: parseWeight(product.quantity),
    source: 'openfoodfacts' as const,
  }
}

export async function testConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/1.json`, {
      signal: withTimeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'KalTracker/1.0' },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return []

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '30',
    fields: 'id,_id,code,product_name,product_name_de,brands,nutriments,image_front_small_url,quantity',
  })

  const headers = { 'User-Agent': 'KalTracker/1.0 (https://github.com/kaltracker)' }

  // Try primary OFF endpoint
  try {
    const response = await fetch(`${SEARCH_URL}?${params}`, {
      headers,
      signal: withTimeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error('HTTP error')
    const data = await response.json()
    const products: OFFProduct[] = data.products || []
    return products
      .map(normalizeProduct)
      .filter((item): item is FoodItem => item !== null)
      .filter((item) => item.calories_per_100g > 0 || item.protein_per_100g > 0)
  } catch (primaryErr) {
    console.warn('Primary OFF failed, trying mirror:', primaryErr)
  }

  // Fallback: mirror domain
  try {
    const response = await fetch(`${SEARCH_URL_MIRROR}?${params}`, {
      headers,
      signal: withTimeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error('HTTP error')
    const data = await response.json()
    const products: OFFProduct[] = data.products || []
    return products
      .map(normalizeProduct)
      .filter((item): item is FoodItem => item !== null)
      .filter((item) => item.calories_per_100g > 0 || item.protein_per_100g > 0)
  } catch (mirrorErr) {
    console.error('Mirror OFF also failed:', mirrorErr)
    const isNetworkError =
      mirrorErr instanceof TypeError && mirrorErr.message.toLowerCase().includes('fetch')
    if (isNetworkError) throw new TypeError('Netzwerkfehler')
    return []
  }
}

export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null

  const headers = { 'User-Agent': 'KalTracker/1.0 (https://github.com/kaltracker)' }

  // Try primary OFF barcode lookup
  try {
    const response = await fetch(`${BASE_URL}/api/v0/product/${barcode}.json`, {
      headers,
      signal: withTimeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error('HTTP error')
    const data = await response.json()
    if (data.status === 1 && data.product) {
      return normalizeProduct({ ...data.product, code: barcode })
    }
    // Product not found on OFF — still try fallback
  } catch (primaryErr) {
    console.warn('Primary OFF barcode failed, trying UPCItemDB:', primaryErr)
  }

  // Fallback: UPCItemDB (free tier, 100 req/day, no key needed)
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { signal: withTimeout(FETCH_TIMEOUT_MS) }
    )
    if (!response.ok) throw new Error('HTTP error')
    const data = await response.json()
    const items: UPCItemDBItem[] = data.items || []
    if (items.length === 0) return null
    const item = items[0]
    // UPCItemDB doesn't have nutritional data — return a partial FoodItem with 0s
    return {
      id: barcode,
      name: item.title ?? 'Unbekanntes Produkt',
      brand: item.brand,
      calories_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fat_per_100g: 0,
      fiber_per_100g: 0,
      image_url: item.images?.[0],
      barcode,
      source: 'openfoodfacts' as const,
    }
  } catch (fallbackErr) {
    console.error('UPCItemDB fallback failed:', fallbackErr)
    return null
  }
}
