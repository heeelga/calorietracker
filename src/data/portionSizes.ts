export type FoodCategory = 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy' | 'other'

export interface PortionSize {
  label: string
  grams: number
}

export interface PortionData {
  category: FoodCategory
  unit: string
  sizes: PortionSize[]
}

export const portionSizes: Record<string, PortionData> = {
  banane: {
    category: 'fruit',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 80 },
      { label: 'mittel', grams: 120 },
      { label: 'groß', grams: 160 },
    ],
  },
  apfel: {
    category: 'fruit',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 100 },
      { label: 'mittel', grams: 150 },
      { label: 'groß', grams: 200 },
    ],
  },
  orange: {
    category: 'fruit',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 100 },
      { label: 'mittel', grams: 150 },
      { label: 'groß', grams: 200 },
    ],
  },
  birne: {
    category: 'fruit',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 100 },
      { label: 'mittel', grams: 150 },
      { label: 'groß', grams: 200 },
    ],
  },
  erdbeere: {
    category: 'fruit',
    unit: 'Portion',
    sizes: [
      { label: 'klein (5 Stück)', grams: 50 },
      { label: 'mittel (10 Stück)', grams: 100 },
      { label: 'groß (15 Stück)', grams: 150 },
    ],
  },
  traube: {
    category: 'fruit',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion', grams: 50 },
      { label: 'mittlere Portion', grams: 100 },
      { label: 'große Portion', grams: 150 },
    ],
  },
  kartoffel: {
    category: 'vegetable',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 80 },
      { label: 'mittel', grams: 130 },
      { label: 'groß', grams: 200 },
    ],
  },
  tomate: {
    category: 'vegetable',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 60 },
      { label: 'mittel', grams: 100 },
      { label: 'groß', grams: 150 },
    ],
  },
  gurke: {
    category: 'vegetable',
    unit: 'Portion',
    sizes: [
      { label: '¼ Gurke', grams: 75 },
      { label: '½ Gurke', grams: 150 },
      { label: '1 Gurke', grams: 300 },
    ],
  },
  möhre: {
    category: 'vegetable',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 60 },
      { label: 'mittel', grams: 100 },
      { label: 'groß', grams: 140 },
    ],
  },
  karotte: {
    category: 'vegetable',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 60 },
      { label: 'mittel', grams: 100 },
      { label: 'groß', grams: 140 },
    ],
  },
  brokkoli: {
    category: 'vegetable',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion', grams: 100 },
      { label: 'mittlere Portion', grams: 150 },
      { label: 'große Portion', grams: 250 },
    ],
  },
  spinat: {
    category: 'vegetable',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion', grams: 75 },
      { label: 'mittlere Portion', grams: 125 },
      { label: 'große Portion', grams: 200 },
    ],
  },
  paprika: {
    category: 'vegetable',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 100 },
      { label: 'mittel', grams: 160 },
      { label: 'groß', grams: 220 },
    ],
  },
  zwiebel: {
    category: 'vegetable',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 50 },
      { label: 'mittel', grams: 100 },
      { label: 'groß', grams: 150 },
    ],
  },
  knoblauch: {
    category: 'vegetable',
    unit: 'Zehe',
    sizes: [
      { label: '1 Zehe', grams: 3 },
      { label: '2 Zehen', grams: 6 },
      { label: '3 Zehen', grams: 9 },
    ],
  },
  ei: {
    category: 'protein',
    unit: 'Stück',
    sizes: [
      { label: 'S (1 Ei)', grams: 45 },
      { label: 'M (1 Ei)', grams: 55 },
      { label: 'L (1 Ei)', grams: 65 },
    ],
  },
  toastbrot: {
    category: 'grain',
    unit: 'Scheibe',
    sizes: [
      { label: '1 Scheibe', grams: 25 },
      { label: '2 Scheiben', grams: 50 },
      { label: '3 Scheiben', grams: 75 },
    ],
  },
  vollkornbrot: {
    category: 'grain',
    unit: 'Scheibe',
    sizes: [
      { label: 'dünn (1 Scheibe)', grams: 35 },
      { label: 'normal (1 Scheibe)', grams: 50 },
      { label: 'dick (1 Scheibe)', grams: 70 },
    ],
  },
  brötchen: {
    category: 'grain',
    unit: 'Stück',
    sizes: [
      { label: 'klein', grams: 45 },
      { label: 'normal', grams: 60 },
      { label: 'groß', grams: 80 },
    ],
  },
  nudeln: {
    category: 'grain',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion (gekocht)', grams: 150 },
      { label: 'normale Portion (gekocht)', grams: 200 },
      { label: 'große Portion (gekocht)', grams: 300 },
    ],
  },
  reis: {
    category: 'grain',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion (gekocht)', grams: 100 },
      { label: 'normale Portion (gekocht)', grams: 150 },
      { label: 'große Portion (gekocht)', grams: 250 },
    ],
  },
  haferflocken: {
    category: 'grain',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion', grams: 40 },
      { label: 'normale Portion', grams: 60 },
      { label: 'große Portion', grams: 80 },
    ],
  },
  butter: {
    category: 'dairy',
    unit: 'Portion',
    sizes: [
      { label: 'wenig (1 TL)', grams: 5 },
      { label: 'normal (1 EL)', grams: 10 },
      { label: 'viel (2 EL)', grams: 20 },
    ],
  },
  käse: {
    category: 'dairy',
    unit: 'Scheibe',
    sizes: [
      { label: '1 Scheibe dünn', grams: 20 },
      { label: '1 Scheibe normal', grams: 30 },
      { label: '2 Scheiben', grams: 60 },
    ],
  },
  joghurt: {
    category: 'dairy',
    unit: 'Portion',
    sizes: [
      { label: 'kleiner Becher (150g)', grams: 150 },
      { label: 'normaler Becher (200g)', grams: 200 },
      { label: 'großer Becher (400g)', grams: 400 },
    ],
  },
  quark: {
    category: 'dairy',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Portion', grams: 100 },
      { label: 'normale Portion', grams: 150 },
      { label: 'große Portion', grams: 250 },
    ],
  },
  milch: {
    category: 'dairy',
    unit: 'Glas',
    sizes: [
      { label: 'kleines Glas', grams: 150 },
      { label: 'normales Glas', grams: 200 },
      { label: 'großes Glas', grams: 300 },
    ],
  },
  hühnerbrust: {
    category: 'protein',
    unit: 'Portion',
    sizes: [
      { label: 'klein (100g)', grams: 100 },
      { label: 'mittel (150g)', grams: 150 },
      { label: 'groß (200g)', grams: 200 },
    ],
  },
  rindfleisch: {
    category: 'protein',
    unit: 'Portion',
    sizes: [
      { label: 'klein (100g)', grams: 100 },
      { label: 'mittel (150g)', grams: 150 },
      { label: 'groß (200g)', grams: 200 },
    ],
  },
  lachs: {
    category: 'protein',
    unit: 'Portion',
    sizes: [
      { label: 'klein (100g)', grams: 100 },
      { label: 'mittel (150g)', grams: 150 },
      { label: 'groß (200g)', grams: 200 },
    ],
  },
  thunfisch: {
    category: 'protein',
    unit: 'Portion',
    sizes: [
      { label: 'kleine Dose (80g)', grams: 80 },
      { label: 'normale Dose (130g)', grams: 130 },
      { label: 'große Dose (185g)', grams: 185 },
    ],
  },
}

export function detectPortionType(foodName: string): PortionData | null {
  const normalized = foodName.toLowerCase().trim()

  // Direct match
  if (portionSizes[normalized]) return portionSizes[normalized]

  // Partial match
  for (const [key, data] of Object.entries(portionSizes)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return data
    }
  }

  return null
}
