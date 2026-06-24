'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Trash2, Edit2, CheckCircle2, Circle, Phone, MapPin, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { Area, Investigator, InvestigatorStatus, TeachingProgress } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS, LESSON_TITLES, formatDate, daysUntil } from '@/lib/labels'

export function InvestigatorsTab() {
  const [investigators, setInvestigators] = useState<Investigator[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Investigator | null>(null)
  const [progressOpen, setProgressOpen] = useState<Investigator | null>(null)

  const empty = {
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    areaId: '',
    status: 'NUEVO' as InvestigatorStatus,
    source: '',
    referredBy: '',
    baptismGoalDate: '',
    notes: '',
  }
  const [form, setForm] = useState(empty)

  const load = async () => {
    setLoading(true)
    try {
      const [ir, ar] = await Promise.all([fetch('/api/investigators'), fetch('/api/areas')])
      if (ir.ok) setInvestigators(await ir.json())
      if (ar.ok) setAreas(await ar.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ ...empty, areaId: areas[0]?.id || '' })
    setDialog(true)
  }

  const openEdit = (inv: Investigator) => {
    setEditing(inv)
    setForm({
      firstName: inv.firstName,
      lastName: inv.lastName,
      phone: inv.phone || '',
      address: inv.address || '',
      areaId: inv.areaId,
      status: inv.status,
      source: inv.source || '',
      referredBy: inv.referredBy || '',
      baptismGoalDate: inv.baptismGoalDate ? inv.baptismGoalDate.slice(0, 10) : '',
      notes: inv.notes || '',
    })
    setDialog(true)
  }

  const save = async () => {
    if (!form.firstName.trim() || !form.areaId) return toast.error('Nombre y área son requeridos')
    const payload = {
      ...form,
      baptismGoalDate: form.baptismGoalDate || null,
    }
    const url = editing ? `/api/investigators/${editing.id}` : '/api/investigators'
    const method = editing ? 'PATCH' : 'POST'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) {
      toast.success(editing ? 'Investigador actualizado' : 'Investigador creado')
      setDialog(false)
      load()
    } else {
      toast.error('Error al guardar')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este investigador?')) return
    const r = await fetch(`/api/investigators/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Eliminado')
      load()
    }
  }

  const toggleLesson = async (invId: string, lessonNumber: number, completed: boolean) => {
    const r = await fetch(`/api/investigators/${invId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonNumber, completed: !completed }),
    })
    if (r.ok) {
      toast.success(!completed ? 'Lección marcada como completada' : 'Lección desmarcada')
      load()
      // refrescar la ventana de progreso si está abierta
      if (progressOpen) {
        const updated = investigators.find((i) => i.id === invId)
        if (updated) {
          // recargar la lista y luego setear el actualizado
          const r2 = await fetch('/api/investigators')
          if (r2.ok) {
            const list = await r2.json() as Investigator[]
            setInvestigators(list)
            const u = list.find((i) => i.id === invId)
            if (u) setProgressOpen(u)
          }
        }
        void updated
      }
    }
  }

  const filtered = investigators.filter((i) => {
    const matchSearch = !search ||
      i.fullName.toLowerCase().includes(search.toLowerCase()) ||
      i.phone?.includes(search) ||
      i.area?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o área…"
              className="pl-9"
            />
          </div>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="NUEVO">Nuevos</TabsTrigger>
            <TabsTrigger value="EN_PROGRESO">En progreso</TabsTrigger>
            <TabsTrigger value="FECHA_BAUTISMO">Con fecha</TabsTrigger>
            <TabsTrigger value="BAUTIZADO">Bautizados</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={openNew} disabled={areas.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo investigador
        </Button>
      </div>

      {/* Lista */}
      {filtered.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-stone-500">
            {investigators.length === 0
              ? 'Aún no hay investigadores registrados. Crea el primero con el botón "Nuevo investigador".'
              : 'No se encontraron resultados con los filtros actuales.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv) => {
            const d = daysUntil(inv.baptismGoalDate)
            return (
              <Card key={inv.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{inv.fullName}</CardTitle>
                      <div className="text-xs text-stone-500 mt-0.5">{inv.area?.name}</div>
                    </div>
                    <Badge className={`shrink-0 ${STATUS_COLORS[inv.status]} border`}>
                      {STATUS_LABELS[inv.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {inv.phone && (
                    <div className="flex items-center gap-2 text-stone-600">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      <span className="text-xs">{inv.phone}</span>
                    </div>
                  )}
                  {inv.address && (
                    <div className="flex items-start gap-2 text-stone-600">
                      <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5" />
                      <span className="text-xs">{inv.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-stone-400" />
                    <span className="text-xs text-stone-600">
                      {inv.lessonsReceived}/5 lecciones · {inv.churchAttendance} asistencia(s)
                    </span>
                  </div>
                  {inv.baptismGoalDate && inv.status !== 'BAUTIZADO' && (
                    <div className={`text-xs font-medium ${d !== null && d <= 7 ? 'text-emerald-700' : 'text-stone-600'}`}>
                      📅 Meta bautismo: {formatDate(inv.baptismGoalDate)}
                      {d !== null && ` (${d === 0 ? 'hoy' : d > 0 ? `${d}d` : `${Math.abs(d)}d atrás`})`}
                    </div>
                  )}
                  {inv.status === 'BAUTIZADO' && inv.baptismDate && (
                    <div className="text-xs font-medium text-teal-700">
                      🎉 Bautizado: {formatDate(inv.baptismDate)}
                    </div>
                  )}

                  {/* Progreso rápido de lecciones */}
                  <div className="flex gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const lesson = inv.progress?.find((p) => p.lessonNumber === n)
                      const done = lesson?.completed
                      return (
                        <button
                          key={n}
                          title={LESSON_TITLES[n - 1]}
                          onClick={() => toggleLesson(inv.id, n, !!done)}
                          className={`flex-1 h-2 rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-stone-200 hover:bg-stone-300'}`}
                        />
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setProgressOpen(inv)}>
                      <BookOpen className="h-3.5 w-3.5 mr-1" /> Lecciones
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(inv)}>
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => remove(inv.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar investigador' : 'Nuevo investigador'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Actualiza la información del investigador.' : 'Registra un nuevo investigador en el área.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div>
              <Label>Nombre</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="55 1234 5678" />
            </div>
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
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle, número, colonia" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v: InvestigatorStatus) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta de bautismo</Label>
              <Input type="date" value={form.baptismGoalDate} onChange={(e) => setForm({ ...form, baptismGoalDate: e.target.value })} />
            </div>
            <div>
              <Label>Fuente</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Referencia, contacto, etc." />
            </div>
            <div>
              <Label>Referido por</Label>
              <Input value={form.referredBy} onChange={(e) => setForm({ ...form, referredBy: e.target.value })} placeholder="Nombre del miembro" />
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? 'Guardar cambios' : 'Crear investigador'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog progreso de lecciones */}
      <Dialog open={!!progressOpen} onOpenChange={(o) => !o && setProgressOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Progreso de lecciones — {progressOpen?.fullName}</DialogTitle>
            <DialogDescription>
              Marca cada lección conforme se enseñe. Las 5 lecciones misionales estándar aparecen pre-cargadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const lesson = progressOpen?.progress?.find((p) => p.lessonNumber === n)
              return (
                <button
                  key={n}
                  onClick={() => progressOpen && toggleLesson(progressOpen.id, n, !!lesson?.completed)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-left transition-colors"
                >
                  {lesson?.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-stone-300 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{LESSON_TITLES[n - 1]}</div>
                    {lesson?.completedDate && (
                      <div className="text-xs text-stone-500 mt-0.5">
                        Completada el {formatDate(lesson.completedDate)}
                      </div>
                    )}
                    {lesson?.notes && (
                      <div className="text-xs text-stone-500 mt-1 italic">{lesson.notes}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
