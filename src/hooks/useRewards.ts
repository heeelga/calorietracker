import { generateId } from '../lib/uuid'
import { useCallback } from 'react'
import { db } from '../lib/db'
import type { Profile } from '../types'

export interface BadgeDefinition {
  key: string
  name: string
  description: string
  icon: string
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { key: 'first_log', name: 'Erster Eintrag', description: 'Dein erster Tagebucheintrag', icon: '🌱' },
  { key: 'streak_3', name: '3 Tage Serie', description: '3 Tage in Folge geloggt', icon: '🔥' },
  { key: 'streak_7', name: '7 Tage Serie', description: '7 Tage in Folge geloggt', icon: '⚡' },
  { key: 'streak_14', name: '2 Wochen Serie', description: '14 Tage in Folge geloggt', icon: '💪' },
  { key: 'streak_30', name: '30 Tage Serie', description: '30 Tage in Folge geloggt', icon: '🏆' },
  { key: 'level_5', name: 'Level 5', description: 'Level 5 erreicht', icon: '⭐' },
  { key: 'level_10', name: 'Level 10', description: 'Level 10 erreicht', icon: '🌟' },
  { key: 'level_20', name: 'Level 20', description: 'Level 20 erreicht', icon: '💎' },
  { key: 'foods_10', name: '10 Lebensmittel', description: '10 verschiedene Lebensmittel geloggt', icon: '🥗' },
  { key: 'foods_50', name: '50 Einträge', description: '50 Einträge insgesamt', icon: '📊' },
  { key: 'foods_100', name: '100 Einträge', description: '100 Einträge insgesamt', icon: '🎯' },
  { key: 'weight_log', name: 'Gewicht geloggt', description: 'Erstes Gewicht eingetragen', icon: '⚖️' },
  { key: 'barcode_scan', name: 'Barcode gescannt', description: 'Erstes Produkt per Barcode gefunden', icon: '📷' },
]

const XP_PER_LOG = 10
const XP_PER_LEVEL = 100

function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function useRewards(userId: string | undefined) {
  const updateStreak = useCallback(async (profile: Profile): Promise<Partial<Profile>> => {
    if (!userId) return {}

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let newStreak = profile.streak_days ?? 0
    const lastLogDate = profile.last_log_date

    if (lastLogDate === today) {
      return {}
    } else if (lastLogDate === yesterday) {
      newStreak += 1
    } else if (lastLogDate !== today) {
      newStreak = 1
    }

    const updates: Partial<Profile> = {
      streak_days: newStreak,
      last_log_date: today,
    }

    await db.profiles.update(userId, updates)
    return updates
  }, [userId])

  const awardXP = useCallback(async (profile: Profile, amount = XP_PER_LOG): Promise<Partial<Profile>> => {
    if (!userId) return {}

    const newXP = (profile.xp ?? 0) + amount
    const newLevel = calculateLevel(newXP)

    const updates: Partial<Profile> = {
      xp: newXP,
      level: newLevel,
    }

    await db.profiles.update(userId, updates)
    return updates
  }, [userId])

  const checkAndAwardBadges = useCallback(async (
    profile: Profile,
    earnedBadgeKeys: string[],
    totalLogCount: number
  ) => {
    if (!userId) return

    const newBadges: string[] = []

    const checkBadge = (key: string, condition: boolean) => {
      if (condition && !earnedBadgeKeys.includes(key)) {
        newBadges.push(key)
      }
    }

    checkBadge('first_log', totalLogCount >= 1)
    checkBadge('streak_3', (profile.streak_days ?? 0) >= 3)
    checkBadge('streak_7', (profile.streak_days ?? 0) >= 7)
    checkBadge('streak_14', (profile.streak_days ?? 0) >= 14)
    checkBadge('streak_30', (profile.streak_days ?? 0) >= 30)
    checkBadge('level_5', (profile.level ?? 1) >= 5)
    checkBadge('level_10', (profile.level ?? 1) >= 10)
    checkBadge('level_20', (profile.level ?? 1) >= 20)
    checkBadge('foods_50', totalLogCount >= 50)
    checkBadge('foods_100', totalLogCount >= 100)

    for (const key of newBadges) {
      await db.badges.add({
        id: generateId(),
        user_id: userId,
        badge_key: key,
        earned_at: new Date().toISOString(),
      })
    }

    return newBadges
  }, [userId])

  const getEarnedBadges = useCallback(async (): Promise<string[]> => {
    if (!userId) return []

    const badges = await db.badges.where({ user_id: userId }).toArray()
    return badges.map((b) => b.badge_key)
  }, [userId])

  return { updateStreak, awardXP, checkAndAwardBadges, getEarnedBadges, BADGE_DEFINITIONS }
}
