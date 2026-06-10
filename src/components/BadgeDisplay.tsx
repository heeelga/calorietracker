import { BADGE_DEFINITIONS } from '../hooks/useRewards'

interface BadgeDisplayProps {
  earnedBadgeKeys: string[]
}

export default function BadgeDisplay({ earnedBadgeKeys }: BadgeDisplayProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {BADGE_DEFINITIONS.map((badge) => {
        const earned = earnedBadgeKeys.includes(badge.key)
        return (
          <div
            key={badge.key}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              earned ? 'bg-slate-700' : 'bg-slate-800/50 opacity-40 grayscale'
            }`}
            title={badge.description}
          >
            <span className="text-2xl">{badge.icon}</span>
            <span className="text-[10px] text-center text-slate-300 font-medium leading-tight">
              {badge.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
