'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Target, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Area, Goal, GoalType } from '@/lib/types'
import { GOAL_TYPE_LABELS } from '@/lib/labels'

export function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)

  const currentPeriod = new Date().toISOString().slice(0, 7) // YYYY-MM
  const empty = {
    areaId: '',
    period: currentPeriod,
    goalType: 'BAUTISMOS' as GoalType,
    target: 1,
    actual: 0,
  }
  const [form, setForm] = useState(empty)

  const load = async () => {
    setLoading(true)
    try {
      const [gr, ar] = await Promise.all([fetch('/api/goals'), fetch('/api/areas')])
      if (gr.ok) setGoals(await gr.json())
      if (ar.ok) setAreas(await ar.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!form.areaId || form.target <= 0) return toast.error('Área y meta requeridos')
    const r = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      toast.success('Meta creada')
      setForm(empty)
      setDialog(false)
      load()
    } else {
      toast.error('Error al crear meta')
    }
  }

  const updateActual = async (g: Goal, delta: number) => {
    const newActual = Math.max(0, g.actual + delta)
    const r = await fetch(`/api/goals/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual: newActual }),
    })
    if (r.ok) {
      load()
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta meta?')) return
    const r = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Meta eliminada')
      load()
    }
  }

  // Agrupar por período
  const grouped = goals.reduce((acc, g) => {
    if (!acc[g.period]) acc[g.period] = []
    acc[g.period].push(g)
    return acc
  }, {} as Record<string, Goal[]>)
  const sortedPeriods = Object.keys(grouped).sort().reverse()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Metas misionales</h2>
          <p className="text-sm text-stone-500">
            Define metas mensuales o trimestrales por área y lleva el seguimiento del progreso.
          </p>
        </div>
        <Button onClick={() => { setForm(empty); setDialog(true) }} disabled={areas.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Nueva meta
        </Button>
      </div>

      {sortedPeriods.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-stone-500">
            No hay metas registradas. Crea la primera meta mensual con el botón "Nueva meta".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedPeriods.map((period) => {
            const [y, m] = period.split('-')
            const monthName = m
              ? new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
              : period
            return (
              <div key={period}>
                <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {monthName}
                  {period.includes('Q') && <Badge variant="outline">Trimestral</Badge>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grouped[period].map((g) => {
                    const pct = g.target > 0 ? Math.min(100, (g.actual / g.target) * 100) : 0
                    const complete = g.actual >= g.target && g.target > 0
                    return (
                      <Card key={g.id} className="group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="font-medium">{g.area?.name}</div>
                              <div className="text-xs text-stone-500 mt-0.5">{GOAL_TYPE_LABELS[g.goalType]}</div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-rose-600"
                              onClick={() => remove(g.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-baseline justify-between mb-2">
                            <div className="text-2xl font-bold">
                              {g.actual}
                              <span className="text-sm text-stone-400">/{g.target}</span>
                            </div>
                            {complete && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                <TrendingUp className="h-3 w-3 mr-1" /> Cumplida
                              </Badge>
                            )}
                          </div>
                          <Progress value={pct} className="h-2 mb-2" />
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-stone-500">{pct.toFixed(0)}% completado</div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateActual(g, -1)}>
                                −
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateActual(g, 1)}>
                                +
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog nueva meta */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva meta misional</DialogTitle>
            <DialogDescription>
              Define una meta mensual (YYYY-MM) o trimestral (YYYY-Q#) para un área.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div>
              <Label>Área</Label>
              <Select value={form.areaId} onValueChange={(v) => setForm({ ...form, areaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Período</Label>
              <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-06 o 2026-Q2" />
            </div>
            <div>
              <Label>Tipo de meta</Label>
              <Select value={form.goalType} onValueChange={(v: GoalType) => setForm({ ...form, goalType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad objetivo</Label>
              <Input type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save}>Crear meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
