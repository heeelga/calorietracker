interface MacroRingProps {
  calories: number
  calorieTarget: number | null
  protein: number
  proteinTarget: number | null
  carbs: number
  carbsTarget: number | null
  fat: number
  fatTarget: number | null
}

function CircleProgress({
  value,
  max,
  color,
  size = 140,
  strokeWidth = 12,
}: {
  value: number
  max: number
  color: string
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / max, 1)
  const offset = circumference - progress * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  )
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string
  value: number
  target: number | null
  color: string
}) {
  const pct = Math.min((value / (target ?? 1)) * 100, 100)
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{Math.round(value)}g</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function MacroRing({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
}: MacroRingProps) {
  const target = calorieTarget ?? 2000
  const remaining = Math.max(target - calories, 0)
  const over = calories > target
  const pct = Math.min(calories / target, 1) * 100
  const ringColor = over ? '#ef4444' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#22c55e'

  return (
    <div className="bg-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <CircleProgress
            value={calories}
            max={target}
            color={ringColor}
            size={130}
            strokeWidth={12}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-100">{Math.round(calories)}</span>
            <span className="text-xs text-slate-400">kcal</span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {over ? 'überschritten' : `${Math.round(remaining)} übrig`}
            </span>
          </div>
        </div>

        {/* Macro bars */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-slate-400">Ziel</span>
            <span className="text-sm font-semibold text-slate-200">{target} kcal</span>
          </div>
          <MacroBar label="Eiweiß" value={protein} target={proteinTarget} color="#22c55e" />
          <MacroBar label="Kohlenhydrate" value={carbs} target={carbsTarget} color="#3b82f6" />
          <MacroBar label="Fett" value={fat} target={fatTarget} color="#f59e0b" />
        </div>
      </div>
    </div>
  )
}
