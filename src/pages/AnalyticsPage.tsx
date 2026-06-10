import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useRewards } from '../hooks/useRewards'
import Layout from '../components/Layout'
import BadgeDisplay from '../components/BadgeDisplay'
import { api } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, LineChart, Line, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { LogEntry, WeightEntry } from '../types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b']

function getWeekDates(weekOffset: number): string[] {
  const today = new Date()
  today.setDate(today.getDate() + weekOffset * 7)
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { getEarnedBadges } = useRewards(user?.id)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekDates = getWeekDates(weekOffset)

  const { data: weekEntries = [] } = useQuery({
    queryKey: ['week_entries', user?.id, weekDates[0]],
    queryFn: async () => {
      if (!user) return []
      return api.get(`/log/week?start=${weekDates[0]}&end=${weekDates[6]}`) as Promise<LogEntry[]>
    },
    enabled: !!user,
  })

  const { data: weightEntries = [] } = useQuery({
    queryKey: ['weight_history', user?.id],
    queryFn: async () => {
      if (!user) return []
      return api.get('/weight') as Promise<WeightEntry[]>
    },
    enabled: !!user,
  })

  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['badges', user?.id],
    queryFn: () => getEarnedBadges(),
    enabled: !!user,
  })

  const { data: totalLogCount = 0 } = useQuery({
    queryKey: ['log_count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const data = await api.get('/log/count')
      return data.count as number
    },
    enabled: !!user,
  })

  const today = new Date().toISOString().split('T')[0]
  const dailyTarget = profile?.calorie_target ?? 2000
  const goal = profile?.goal ?? 'maintain'

  // Build per-day data — MariaDB DATE may come back as full ISO string, so slice to 10 chars
  const barData = weekDates.map((date, i) => {
    const dayEntries = weekEntries.filter((e) => String(e.log_date).slice(0, 10) === date)
    const cal = Math.round(dayEntries.reduce((s, e) => s + Number(e.calories), 0))
    const isToday = date === today
    const isFuture = date > today
    // "ok" = within goal: for lose/maintain: cal <= target; for gain: cal >= target
    const ok = cal === 0 ? false : goal === 'gain' ? cal >= dailyTarget : cal <= dailyTarget
    const status: 'empty' | 'ok' | 'over' = cal === 0 ? 'empty' : ok ? 'ok' : 'over'
    return { day: DAY_LABELS[i], calories: cal, date, status, isToday, isFuture }
  })

  // Accumulated calories this week
  const weekTotal = barData.reduce((s, d) => s + d.calories, 0)
  const weekBudget = dailyTarget * 7
  const daysElapsed = barData.filter(d => !d.isFuture).length

  // Macro pie chart
  const totalProtein = weekEntries.reduce((s, e) => s + Number(e.protein_g), 0)
  const totalCarbs = weekEntries.reduce((s, e) => s + Number(e.carbs_g), 0)
  const totalFat = weekEntries.reduce((s, e) => s + Number(e.fat_g), 0)

  const pieData = [
    { name: 'Eiweiß', value: Math.round(totalProtein) },
    { name: 'Kohlenhydrate', value: Math.round(totalCarbs) },
    { name: 'Fett', value: Math.round(totalFat) },
  ].filter((d) => d.value > 0)

  const daysWithData = barData.filter((d) => d.calories > 0)
  const avgCalories = daysWithData.length
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0

  const weekLabel = `${new Date(weekDates[0]).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${new Date(weekDates[6]).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`

  return (
    <Layout title="Analyse" showNav>
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Week selector */}
        <div className="flex items-center justify-between bg-slate-800 rounded-2xl px-4 py-3">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <span className="text-sm font-medium text-slate-100">{weekLabel}</span>
          <button onClick={() => setWeekOffset((o) => Math.min(0, o + 1))} disabled={weekOffset === 0} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30">
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-green-400">{avgCalories}</p>
            <p className="text-[10px] text-slate-400">ø kcal/Tag</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-orange-400">{profile?.streak_days ?? 0}</p>
            <p className="text-[10px] text-slate-400">Beste Serie</p>
          </div>
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{totalLogCount}</p>
            <p className="text-[10px] text-slate-400">Einträge gesamt</p>
          </div>
        </div>

        {/* Weekly calorie chart */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Wochenkalorien</h3>
            <span className="text-xs text-slate-400">Ziel: {dailyTarget} kcal/Tag</span>
          </div>

          {/* Custom bar chart */}
          <div className="flex items-end gap-1.5 h-36">
            {barData.map((d) => {
              const pct = d.calories > 0 ? Math.min(d.calories / (dailyTarget * 1.3), 1) : 0
              const barColor = d.status === 'ok' ? '#22c55e' : d.status === 'over' ? '#ef4444' : '#1e293b'
              const borderColor = d.isToday ? '#22c55e' : 'transparent'
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-400 leading-none">
                    {d.calories > 0 ? d.calories : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end relative">
                    {/* Target line */}
                    <div
                      className="absolute w-full border-t border-dashed border-slate-600"
                      style={{ bottom: `${(1 / 1.3) * 100}%` }}
                    />
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(pct * 100, d.calories > 0 ? 4 : 0)}%`,
                        backgroundColor: d.isFuture ? '#1e293b' : barColor,
                        outline: d.isToday ? `2px solid ${borderColor}` : 'none',
                        outlineOffset: '1px',
                        minHeight: d.calories > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${d.isToday ? 'text-green-400' : 'text-slate-400'}`}>
                    {d.day}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Weekly progress */}
          <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400">Woche gesamt</p>
              <p className="text-sm font-semibold text-slate-100">{weekTotal.toLocaleString('de-DE')} kcal</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Wochenbudget</p>
              <p className="text-sm font-semibold text-slate-400">{weekBudget.toLocaleString('de-DE')} kcal</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((weekTotal / (dailyTarget * daysElapsed || 1)) * 100, 100)}%`,
                backgroundColor: weekTotal > dailyTarget * daysElapsed ? '#ef4444' : '#22c55e',
              }}
            />
          </div>
          <div className="mt-2 flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block"/>Ziel eingehalten</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block"/>Ziel überschritten</span>
          </div>
        </div>

        {/* Macro pie chart */}
        {pieData.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Makroverteilung (Woche)</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                    formatter={(value) => [`${value}g`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs text-slate-300">{entry.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{entry.value}g</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Weight chart */}
        {weightEntries.length > 1 && (
          <div className="bg-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Gewichtsverlauf</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weightEntries.map((w) => ({ date: w.log_date.slice(5), weight: w.weight_kg }))} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(v) => [`${v} kg`]}
                />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="kg" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Badges */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Abzeichen ({earnedBadges.length}/{13})
          </h3>
          <BadgeDisplay earnedBadgeKeys={earnedBadges} />
        </div>
      </div>
    </Layout>
  )
}
