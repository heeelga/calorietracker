import type { BadgeDefinition } from '../hooks/useRewards'

interface Props {
  badge: BadgeDefinition | null
  onClose: () => void
}

export default function BadgeNotification({ badge, onClose }: Props) {
  if (!badge) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="animate-badge-in relative mx-6 max-w-sm w-full bg-slate-800 rounded-3xl p-8 flex flex-col items-center gap-4 border-2 animate-shimmer-border"
        style={{ borderColor: '#eab308' }}
      >
        {/* Icon */}
        <div className="text-6xl animate-bounce">{badge.icon}</div>

        {/* Header */}
        <p className="text-slate-300 text-sm font-medium">🏆 Abzeichen freigeschaltet!</p>

        {/* Name */}
        <h2 className="text-2xl font-bold text-green-400 text-center">{badge.name}</h2>

        {/* Description */}
        <p className="text-slate-400 text-sm text-center">{badge.description}</p>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="mt-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-colors"
        >
          Weiter
        </button>
      </div>
    </div>
  )
}
