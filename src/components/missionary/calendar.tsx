'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, Droplet, CheckCircle2 } from 'lucide-react'
import type { Investigator } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS, formatDateLong, formatDate } from '@/lib/labels'

export function CalendarTab() {
  const [items, setItems] = useState<Investigator[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/investigators')
      if (r.ok) {
        const data = (await r.json()) as Investigator[]
        // Filtrar los que tienen alguna fecha (objetivo o bautismo real)
        const withDates = data.filter((i) => i.baptismGoalDate || i.baptismDate)
        setItems(withDates)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const filtered = items.filter((i) => {
    const date = i.baptismDate || i.baptismGoalDate
    if (!date) return false
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    if (filter === 'upcoming') return d >= now
    if (filter === 'past') return d < now
    return true
  })

  // Agrupar por mes
  const grouped = filtered.reduce((acc, i) => {
    const date = i.baptismDate || i.baptismGoalDate
    if (!date) return acc
    const key = new Date(date).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(i)
    return acc
  }, {} as Record<string, Investigator[]>)

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Calendario de bautismos</h2>
          <p className="text-sm text-stone-500">
            Fechas objetivo y bautismos realizados. Filtra por próximos, pasados o todos.
          </p>
        </div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
          {(['upcoming', 'past', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === f ? 'bg-white shadow-sm font-medium' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {f === 'upcoming' ? 'Próximos' : f === 'past' ? 'Realizados' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-stone-500">
            No hay fechas registradas en esta vista. Asigna "Meta de bautismo" en la pestaña Investigadores o marca un investigador como "Bautizado" con fecha.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, list]) => (
            <div key={month}>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {month}
                <span className="text-xs text-stone-400">· {list.length}</span>
              </h3>
              <div className="space-y-2">
                {list.map((i) => {
                  const isBaptized = i.status === 'BAUTIZADO' && i.baptismDate
                  const date = i.baptismDate || i.baptismGoalDate
                  return (
                    <Card key={i.id} className={isBaptized ? 'border-teal-200 bg-teal-50/30' : ''}>
                      <CardContent className="py-3 flex items-center gap-4">
                        <div className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                          isBaptized ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700'
                        }`}>
                          <div className="text-lg font-bold leading-none">
                            {date ? new Date(date).getDate() : '—'}
                          </div>
                          <div className="text-[10px] uppercase">
                            {date ? new Date(date).toLocaleDateString('es-MX', { month: 'short' }) : ''}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {i.fullName}
                            {isBaptized && <CheckCircle2 className="h-4 w-4 text-teal-600" />}
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5">
                            {i.area?.name} · {formatDateLong(date)}
                          </div>
                        </div>
                        <Badge className={`shrink-0 ${STATUS_COLORS[i.status]} border`}>
                          {isBaptized ? (
                            <><Droplet className="h-3 w-3 mr-1" /> Bautizado</>
                          ) : (
                            STATUS_LABELS[i.status]
                          )}
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
