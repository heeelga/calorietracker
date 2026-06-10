import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useRewards } from '../hooks/useRewards'
import Layout from '../components/Layout'
import BadgeDisplay from '../components/BadgeDisplay'
import { db } from '../lib/db'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Legend,
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
      const data = await db.log_entries
        .where('user_id').equals(user.id)
        .filter((e) => e.log_date >= weekDates[0] && e.log_date <= weekDates[6])
        .toArray()
      return data as LogEntry[]
    },
    enabled: !!user,
  })

  const { data: weightEntries = [] } = useQuery({
    queryKey: ['weight_history', user?.id],
    queryFn: async () => {
      if (!user) return []
      const data = await db.weight_log
        .where('user_id').equals(user.id)
        .sortBy('log_date')
      return data.slice(-30) as WeightEntry[]
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
      return db.log_entries.where('user_id').equals(user.id).count()
    },
    enabled: !!user,
  })

  // Build bar chart data
  const barData = weekDates.map((date, i) => {
    const dayEntries = weekEntries.filter((e) => e.log_date === date)
    const cal = dayEntries.reduce((s, e) => s + e.calories, 0)
    return { day: DAY_LABELS[i], calories: Math.round(cal), date }
  })

  // Macro pie chart
  const totalProtein = weekEntries.reduce((s, e) => s + e.protein_g, 0)
  const totalCarbs = weekEntries.reduce((s, e) => s + e.carbs_g, 0)
  const totalFat = weekEntries.reduce((s, e) => s + e.fat_g, 0)

  const pieData = [
    { name: 'Eiweiß', value: Math.round(totalProtein) },
    { name: 'Kohlenhydrate', value: Math.round(totalCarbs) },
    { name: 'Fett', value: Math.round(totalFat) },
  ].filter((d) => d.value > 0)

  // Avg calories
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

        {/* Calories bar chart */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Kalorienverlauf</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                labelStyle={{ color: '#f1f5f9' }}
                itemStyle={{ color: '#22c55e' }}
              />
              {profile && (
                <ReferenceLine y={profile.calorie_target ?? 2000} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
              )}
              <Bar dataKey="calories" fill="#22c55e" radius={[4, 4, 0, 0]} name="kcal" />
            </BarChart>
          </ResponsiveContainer>
          {profile && (
            <p className="text-xs text-red-400 text-center mt-1">— Ziel: {profile.calorie_target} kcal</p>
          )}
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
