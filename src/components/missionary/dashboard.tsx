'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, MapPin, Droplet, Calendar, Target, Church, TrendingUp, BookOpen } from 'lucide-react'
import type { Stats } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS, formatDate, daysUntil } from '@/lib/labels'

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/stats')
      if (r.ok) setStats(await r.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  const activeInvestigators = stats.totals.investigatorsByStatus
    .filter((s) => ['NUEVO', 'EN_PROGRESO', 'FECHA_BAUTISMO'].includes(s.status))
    .reduce((acc, s) => acc + s._count, 0)

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Investigadores activos"
          value={activeInvestigators}
          accent="text-amber-600"
          bg="bg-amber-50"
        />
        <KpiCard
          icon={<Droplet className="h-5 w-5" />}
          label="Bautismos este mes"
          value={stats.totals.baptismsThisMonth}
          accent="text-teal-600"
          bg="bg-teal-50"
        />
        <KpiCard
          icon={<MapPin className="h-5 w-5" />}
          label="Áreas activas"
          value={stats.totals.areas}
          accent="text-rose-600"
          bg="bg-rose-50"
        />
        <KpiCard
          icon={<Church className="h-5 w-5" />}
          label="Total bautizados"
          value={stats.totals.baptized}
          accent="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* Distribución por estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-stone-500" />
            Investigadores por estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.totals.investigatorsByStatus.map((s) => (
              <div key={s.status} className={`rounded-lg border p-3 ${STATUS_COLORS[s.status]}`}>
                <div className="text-2xl font-bold">{s._count}</div>
                <div className="text-xs mt-1">{STATUS_LABELS[s.status]}</div>
              </div>
            ))}
            {stats.totals.investigatorsByStatus.length === 0 && (
              <div className="col-span-5 text-sm text-stone-500 text-center py-4">
                Aún no hay investigadores registrados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Próximos bautismos + Resumen por área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Próximos bautismos programados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingBaptisms.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-6">
                No hay bautismos programados. Asigna una fecha objetivo en la pestaña Investigadores.
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stats.upcomingBaptisms.map((b) => {
                  const d = daysUntil(b.date)
                  return (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-stone-500">
                          {b.area} · {formatDate(b.date)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={d !== null && d <= 7 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : ''}
                      >
                        {d !== null ? (d === 0 ? 'Hoy' : d > 0 ? `${d} días` : `Hace ${Math.abs(d)}d`) : ''}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-rose-600" />
              Resumen por área
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.areaStats.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-6">
                Aún no hay áreas registradas. Crea zonas y áreas en la pestaña Áreas.
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stats.areaStats.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-stone-500 truncate">
                        {a.zone} · {a.companions}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      <div className="text-center">
                        <div className="font-semibold text-amber-600">{a.activeInvestigators}</div>
                        <div className="text-[10px] text-stone-500">Activos</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-teal-600">{a.baptizedInArea}</div>
                        <div className="text-[10px] text-stone-500">Bautizados</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metas actuales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-stone-500" />
            Metas del período actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.goals.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">
              No hay metas registradas. Ve a la pestaña Metas para crearlas.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.goals.map((g) => {
                const pct = g.target > 0 ? Math.min(100, (g.actual / g.target) * 100) : 0
                return (
                  <div key={g.id} className="p-3 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">
                          {g.area?.name} · {g.period}
                        </div>
                        <div className="text-xs text-stone-500 capitalize">
                          {g.goalType.toLowerCase().replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {g.actual}/{g.target}
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
  bg: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-stone-500 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${accent}`}>{value}</div>
          </div>
          <div className={`p-2 rounded-lg ${bg} ${accent}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
