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
import { Plus, Trash2, Calendar, Users, ClipboardList, Target, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { Area, CorrelationMeeting, AgendaItem } from '@/lib/types'
import { AGENDA_STATUS_LABELS, AGENDA_STATUS_COLORS, formatDateLong, formatDate } from '@/lib/labels'

export function CorrelationTab() {
  const [meetings, setMeetings] = useState<CorrelationMeeting[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  const [dialog, setDialog] = useState(false)
  const [viewDialog, setViewDialog] = useState<CorrelationMeeting | null>(null)

  const empty = {
    areaId: '',
    meetingDate: new Date().toISOString().slice(0, 10),
    leader: '',
    attendees: '',
    vision: '',
    priorities: '',
    notes: '',
    commitments: '',
    agendaItems: [{ topic: '', discussion: '', action: '', responsible: '' }],
  }
  const [form, setForm] = useState(empty)

  const load = async () => {
    setLoading(true)
    try {
      const [mr, ar] = await Promise.all([fetch('/api/correlation'), fetch('/api/areas')])
      if (mr.ok) setMeetings(await mr.json())
      if (ar.ok) setAreas(await ar.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!form.leader.trim() || !form.meetingDate) return toast.error('Fecha y líder son requeridos')
    const payload = {
      ...form,
      areaId: form.areaId || null,
      agendaItems: form.agendaItems.filter((a) => a.topic.trim()),
    }
    const r = await fetch('/api/correlation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) {
      toast.success('Reunión de correlación registrada')
      setForm(empty)
      setDialog(false)
      load()
    } else {
      toast.error('Error al guardar')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta reunión?')) return
    const r = await fetch(`/api/correlation/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Reunión eliminada')
      load()
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Reuniones de correlación</h2>
          <p className="text-sm text-stone-500">
            Registra las reuniones semanales de correlación con líderes de barrio, misioneros y compromisos.
          </p>
        </div>
        <Button onClick={() => { setForm(empty); setDialog(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Nueva reunión
        </Button>
      </div>

      {meetings.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-stone-500">
            Aún no hay reuniones de correlación registradas. Crea la primera con el botón "Nueva reunión".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-stone-500" />
                      {formatDate(m.meetingDate)}
                      {m.area && <Badge variant="outline" className="ml-1 font-normal">{m.area.name}</Badge>}
                      {!m.area && <Badge variant="outline" className="ml-1 font-normal">General</Badge>}
                    </CardTitle>
                    <div className="text-xs text-stone-500 mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {m.leader}
                      </span>
                      {m.attendees && <span>· {m.attendees}</span>}
                      <span>· {m.agendaItems?.length || 0} items en agenda</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setViewDialog(m)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-rose-600" onClick={() => remove(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(m.vision || m.priorities || m.commitments) && (
                <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {m.vision && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1 mb-1">
                        <Target className="h-3 w-3" /> Visión
                      </div>
                      <div className="text-xs text-stone-700 line-clamp-3">{m.vision}</div>
                    </div>
                  )}
                  {m.priorities && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1 mb-1">
                        <ClipboardList className="h-3 w-3" /> Prioridades
                      </div>
                      <div className="text-xs text-stone-700 line-clamp-3">{m.priorities}</div>
                    </div>
                  )}
                  {m.commitments && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1 mb-1">
                        <ClipboardList className="h-3 w-3" /> Compromisos
                      </div>
                      <div className="text-xs text-stone-700 line-clamp-3">{m.commitments}</div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog nueva reunión */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva reunión de correlación</DialogTitle>
            <DialogDescription>
              Registra la reunión semanal con líderes de barrio y misioneros. Incluye agenda y compromisos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} />
              </div>
              <div>
                <Label>Área (opcional)</Label>
                <Select value={form.areaId || 'general'} onValueChange={(v) => setForm({ ...form, areaId: v === 'general' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (toda la zona)</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Líder que preside</Label>
                <Input value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })} placeholder="Obispo, líder misional de barrio" />
              </div>
            </div>
            <div>
              <Label>Asistentes</Label>
              <Input value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="Elderes, líderes del sacerdocio, miembros" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Visión / enfoque</Label>
                <Textarea rows={3} value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} placeholder="Enfoque de la semana" />
              </div>
              <div>
                <Label>Prioridades</Label>
                <Textarea rows={3} value={form.priorities} onChange={(e) => setForm({ ...form, priorities: e.target.value })} placeholder="Prioridades principales" />
              </div>
              <div>
                <Label>Compromisos</Label>
                <Textarea rows={3} value={form.commitments} onChange={(e) => setForm({ ...form, commitments: e.target.value })} placeholder="Compromisos generales" />
              </div>
            </div>

            {/* Agenda items */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Agenda de la reunión</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({
                    ...form,
                    agendaItems: [...form.agendaItems, { topic: '', discussion: '', action: '', responsible: '' }],
                  })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Item
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {form.agendaItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start border border-stone-200 rounded-lg p-2">
                    <Input
                      className="col-span-12 md:col-span-4"
                      placeholder="Tema del item"
                      value={item.topic}
                      onChange={(e) => {
                        const copy = [...form.agendaItems]
                        copy[idx] = { ...item, topic: e.target.value }
                        setForm({ ...form, agendaItems: copy })
                      }}
                    />
                    <Input
                      className="col-span-12 md:col-span-4"
                      placeholder="Discusión / análisis"
                      value={item.discussion}
                      onChange={(e) => {
                        const copy = [...form.agendaItems]
                        copy[idx] = { ...item, discussion: e.target.value }
                        setForm({ ...form, agendaItems: copy })
                      }}
                    />
                    <Input
                      className="col-span-7 md:col-span-2"
                      placeholder="Acción"
                      value={item.action}
                      onChange={(e) => {
                        const copy = [...form.agendaItems]
                        copy[idx] = { ...item, action: e.target.value }
                        setForm({ ...form, agendaItems: copy })
                      }}
                    />
                    <Input
                      className="col-span-4 md:col-span-1"
                      placeholder="Resp."
                      value={item.responsible}
                      onChange={(e) => {
                        const copy = [...form.agendaItems]
                        copy[idx] = { ...item, responsible: e.target.value }
                        setForm({ ...form, agendaItems: copy })
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="col-span-1 text-rose-600"
                      onClick={() => setForm({ ...form, agendaItems: form.agendaItems.filter((_, i) => i !== idx) })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notas adicionales</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save}>Guardar reunión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ver reunión */}
      <Dialog open={!!viewDialog} onOpenChange={(o) => !o && setViewDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reunión del {formatDateLong(viewDialog?.meetingDate)}</DialogTitle>
            <DialogDescription>
              {viewDialog?.area?.name || 'Reunión general'} · Preside: {viewDialog?.leader}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            {viewDialog?.attendees && (
              <Field label="Asistentes" value={viewDialog.attendees} />
            )}
            {viewDialog?.vision && <Field label="Visión / enfoque" value={viewDialog.vision} />}
            {viewDialog?.priorities && <Field label="Prioridades" value={viewDialog.priorities} />}
            {viewDialog?.commitments && <Field label="Compromisos" value={viewDialog.commitments} />}
            {viewDialog?.agendaItems && viewDialog.agendaItems.length > 0 && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-stone-500">Agenda</Label>
                <div className="mt-2 space-y-2">
                  {viewDialog.agendaItems.map((item: AgendaItem) => (
                    <div key={item.id} className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{item.topic}</div>
                        <Badge className={`shrink-0 ${AGENDA_STATUS_COLORS[item.status]} border`}>
                          {AGENDA_STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                      {item.discussion && <div className="text-xs text-stone-600 mt-1">{item.discussion}</div>}
                      {item.action && (
                        <div className="text-xs mt-1">
                          <span className="text-stone-500">Acción:</span>{' '}
                          <span className="text-stone-800">{item.action}</span>
                          {item.responsible && <span className="text-stone-500"> · Responsable: {item.responsible}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewDialog?.notes && <Field label="Notas" value={viewDialog.notes} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-stone-500">{label}</Label>
      <div className="mt-1 text-stone-800 whitespace-pre-wrap">{value}</div>
    </div>
  )
}
