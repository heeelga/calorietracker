import type { FoodItem } from '../types'

const BASE_URL = 'https://world.openfoodfacts.org'
const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

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

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return []

  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '20',
      lc: 'de',
      fields: 'id,_id,code,product_name,product_name_de,brands,nutriments,image_front_small_url,quantity',
    })

    const response = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { 'User-Agent': 'KalTracker/1.0 (https://github.com/kaltracker)' },
    })

    if (!response.ok) throw new Error('Netzwerkfehler')

    const data = await response.json()
    const products: OFFProduct[] = data.products || []

    return products
      .map(normalizeProduct)
      .filter((item): item is FoodItem => item !== null)
      .filter((item) => item.calories_per_100g > 0 || item.protein_per_100g > 0)
  } catch (error) {
    console.error('Fehler bei der Suche:', error)
    return []
  }
}

export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null

  try {
    const response = await fetch(`${BASE_URL}/api/v0/product/${barcode}.json`, {
      headers: { 'User-Agent': 'KalTracker/1.0 (https://github.com/kaltracker)' },
    })

    if (!response.ok) throw new Error('Netzwerkfehler')

    const data = await response.json()

    if (data.status !== 1 || !data.product) {
      return null
    }

    return normalizeProduct({ ...data.product, code: barcode })
  } catch (error) {
    console.error('Fehler beim Barcode-Lookup:', error)
    return null
  }
}
