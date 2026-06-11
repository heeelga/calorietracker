import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ChevronDown, ChevronUp, StickyNote } from 'lucide-react'

interface BodyMeasurement {
  id: string
  user_id: string
  log_date: string
  weight_kg: number | null
  fat_pct: number | null
  muscle_pct: number | null
  visceral: number | null
  note: string | null
  created_at: string
}

const today = new Date().toISOString().split('T')[0]

function fmt(v: number | null, decimals = 1): string {
  if (v == null) return '—'
  return Number(v).toFixed(decimals)
}

function deltaColor(
  current: number | null,
  previous: number | null,
  metric: 'weight' | 'fat' | 'muscle' | 'visceral',
  goal: string | null,
): string {
  if (current == null || previous == null) return 'text-slate-400'
  const delta = Number(current) - Number(previous)
  if (Math.abs(delta) < 0.01) return 'text-slate-400'
  switch (metric) {
    case 'weight':
      if (goal === 'lose') return delta < 0 ? 'text-green-400' : 'text-red-400'
      if (goal === 'gain') return delta > 0 ? 'text-green-400' : 'text-red-400'
      return delta < 0 ? 'text-green-400' : 'text-slate-300'
    case 'fat':
    case 'visceral':
      return delta < 0 ? 'text-green-400' : 'text-red-400'
    case 'muscle':
      return delta > 0 ? 'text-green-400' : 'text-red-400'
  }
}

function deltaLabel(current: number | null, previous: number | null, decimals = 1): string {
  if (current == null || previous == null) return ''
  const delta = Number(current) - Number(previous)
  if (Math.abs(delta) < 0.01) return ''
  return (delta > 0 ? '+' : '') + delta.toFixed(decimals)
}

export default function BodyPage() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [fat, setFat] = useState('')
  const [muscle, setMuscle] = useState('')
  const [visceral, setVisceral] = useState('')
  const [note, setNote] = useState('')

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['measurements', user?.id],
    queryFn: () => api.get('/measurements?limit=10') as Promise<BodyMeasurement[]>,
    enabled: !!user,
  })

  const last5 = entries.slice(0, 5)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await api.post('/measurements', {
        log_date: date,
        weight_kg: weight ? parseFloat(weight) : null,
        fat_pct: fat ? parseFloat(fat) : null,
        muscle_pct: muscle ? parseFloat(muscle) : null,
        visceral: visceral ? parseInt(visceral) : null,
        note: note || null,
      })
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
      setShowForm(false)
      setWeight('')
      setFat('')
      setMuscle('')
      setVisceral('')
      setNote('')
      setDate(today)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await api.del(`/measurements/${id}`)
    queryClient.invalidateQueries({ queryKey: ['measurements'] })
  }

  const goal = profile?.goal ?? null

  return (
    <Layout title="Körperwerte" showNav>
      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Add button */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-green-500/40 rounded-2xl text-green-400 font-semibold hover:border-green-500 hover:bg-green-500/5 transition-colors"
        >
          <Plus size={18} />
          {showForm ? 'Abbrechen' : 'Neue Messung eintragen'}
        </button>

        {/* Entry form */}
        {showForm && (
          <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-300">Messung eintragen</h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Gewicht (kg)</label>
                <input
                  type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  placeholder="z.B. 82.5" step="0.1" min="20" max="300"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Körperfett (%)</label>
                <input
                  type="number" value={fat} onChange={(e) => setFat(e.target.value)}
                  placeholder="z.B. 18.5" step="0.1" min="3" max="60"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Muskelanteil (%)</label>
                <input
                  type="number" value={muscle} onChange={(e) => setMuscle(e.target.value)}
                  placeholder="z.B. 42.0" step="0.1" min="20" max="80"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Viszeralwert</label>
                <input
                  type="number" value={visceral} onChange={(e) => setVisceral(e.target.value)}
                  placeholder="z.B. 8" step="1" min="1" max="30"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Notiz (optional)</label>
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="z.B. Nach dem Sport, nüchtern gemessen…"
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? 'Speichern…' : 'Messung speichern'}
            </button>
          </div>
        )}

        {/* Entries */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : last5.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Noch keine Messungen eingetragen
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {last5.map((entry, idx) => {
              const prev = last5[idx + 1] ?? null
              const isExpanded = expandedId === entry.id

              return (
                <div key={entry.id} className="bg-slate-800 rounded-2xl overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {new Date(String(entry.log_date).slice(0, 10)).toLocaleDateString('de-DE', {
                          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                      {entry.note && (
                        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                          <StickyNote size={10} />
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Metric grid */}
                  <div className="grid grid-cols-4 gap-px bg-slate-700/50 border-t border-slate-700/50">
                    {[
                      {
                        label: 'Gewicht', value: fmt(entry.weight_kg), unit: 'kg',
                        delta: deltaLabel(entry.weight_kg, prev?.weight_kg ?? null),
                        color: deltaColor(entry.weight_kg, prev?.weight_kg ?? null, 'weight', goal),
                      },
                      {
                        label: 'Fett', value: fmt(entry.fat_pct), unit: '%',
                        delta: deltaLabel(entry.fat_pct, prev?.fat_pct ?? null),
                        color: deltaColor(entry.fat_pct, prev?.fat_pct ?? null, 'fat', goal),
                      },
                      {
                        label: 'Muskeln', value: fmt(entry.muscle_pct), unit: '%',
                        delta: deltaLabel(entry.muscle_pct, prev?.muscle_pct ?? null),
                        color: deltaColor(entry.muscle_pct, prev?.muscle_pct ?? null, 'muscle', goal),
                      },
                      {
                        label: 'Viszeral', value: fmt(entry.visceral, 0), unit: '',
                        delta: deltaLabel(entry.visceral, prev?.visceral ?? null, 0),
                        color: deltaColor(entry.visceral, prev?.visceral ?? null, 'visceral', goal),
                      },
                    ].map(({ label, value, unit, delta, color }) => (
                      <div key={label} className="bg-slate-800 px-2 py-2.5 text-center">
                        <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                        <p className="text-sm font-bold text-slate-100">
                          {value}{value !== '—' && unit ? <span className="text-[10px] font-normal text-slate-400 ml-0.5">{unit}</span> : ''}
                        </p>
                        {delta && (
                          <p className={`text-[10px] font-medium mt-0.5 ${color}`}>{delta}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Expanded note */}
                  {isExpanded && entry.note && (
                    <div className="px-4 py-3 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400 leading-relaxed">{entry.note}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
