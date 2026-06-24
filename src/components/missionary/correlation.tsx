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
import { Plus, Trash2, Calendar, Users, Sparkles, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { Area, CorrelationMeeting, AIAnalysis } from '@/lib/types'
import { AI_STATUS_LABELS, AI_STATUS_COLORS, formatDateLong, formatDate } from '@/lib/labels'
import { AIAnalysisModal } from './ai-analysis-modal'

export function CorrelationTab() {
  const [meetings, setMeetings] = useState<CorrelationMeeting[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  const [dialog, setDialog] = useState(false)
  const [aiModalMeetingId, setAiModalMeetingId] = useState<string | null>(null)
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, AIAnalysis | null>>({})

  // Form state — ahora es una sola nota grande dividida por secciones
  const [form, setForm] = useState({
    meetingDate: new Date().toISOString().slice(0, 10),
    leader: '',
    attendees: '',
    vision: '',
    priorities: '',
    notes: '',  // <-- aquí van TODAS las notas divididas por área
    commitments: '',
  })

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

  const loadAIStatuses = async (meetingIds: string[]) => {
    if (meetingIds.length === 0) return
    const entries = await Promise.all(
      meetingIds.map(async (id) => {
        try {
          const r = await fetch(`/api/correlation/${id}/analyze`)
          if (r.ok) {
            const data = await r.json()
            return [id, data.analysis] as const
          }
        } catch {}
        return [id, null] as const
      })
    )
    const map: Record<string, AIAnalysis | null> = {}
    entries.forEach(([id, analysis]) => { map[id] = analysis })
    setAiAnalysisMap(map)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (meetings.length > 0) {
      loadAIStatuses(meetings.map((m) => m.id))
    }
  }, [meetings.length])

  // Generar plantilla de notas con secciones por área
  const generateNotesTemplate = () => {
    if (areas.length === 0) return ''
    const sections = areas.map((a) => `=== ${a.name} ===\n\n`).join('\n')
    return sections
  }

  const openNew = () => {
    setForm({
      meetingDate: new Date().toISOString().slice(0, 10),
      leader: '',
      attendees: '',
      vision: '',
      priorities: '',
      notes: generateNotesTemplate(),
      commitments: '',
    })
    setDialog(true)
  }

  const save = async () => {
    if (!form.leader.trim() || !form.meetingDate) return toast.error('Fecha y líder son requeridos')
    if (!form.notes.trim()) return toast.error('Las notas no pueden estar vacías')

    const r = await fetch('/api/correlation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        areaId: null,  // null = general de zona (todas las áreas)
        meetingDate: form.meetingDate,
        leader: form.leader,
        attendees: form.attendees || null,
        vision: form.vision || null,
        priorities: form.priorities || null,
        notes: form.notes,
        commitments: form.commitments || null,
        agendaItems: [],  // sin agenda items por ahora — todo va en notes
      }),
    })
    if (r.ok) {
      toast.success('Reunión creada')
      setDialog(false)
      load()
    } else {
      toast.error('Error al guardar')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta reunión y todo su análisis de IA?')) return
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
          <h2 className="text-xl font-semibold">Coordinación misional</h2>
          <p className="text-sm text-stone-500">
            Escribe todas las notas de la reunión en una sola nota grande dividida por área. La IA hará el resto.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nueva reunión
        </Button>
      </div>

      {meetings.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-stone-500">
            Aún no hay reuniones de coordinación registradas. Crea la primera con el botón "Nueva reunión".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            // Extraer áreas mencionadas en las notas (entre ===)
            const areaMentions = (m.notes || '').split(/^=== (.+?) ===$/m).filter((_, i) => i % 2 === 1)
            return (
              <Card key={m.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4 text-stone-500" />
                        {formatDate(m.meetingDate)}
                        <Badge variant="outline" className="font-normal">General de zona</Badge>
                      </CardTitle>
                      <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {m.leader}
                        </span>
                        {m.attendees && <span>· {m.attendees}</span>}
                      </div>
                      {areaMentions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {areaMentions.map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px] bg-stone-50">
                              {a.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 bg-violet-600 hover:bg-violet-700"
                        onClick={() => setAiModalMeetingId(m.id)}
                        title="Analizar con IA"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> IA
                        {aiAnalysisMap[m.id] && aiAnalysisMap[m.id]!.status !== 'PROCESANDO' && (
                          <Badge className={`ml-1 ${AI_STATUS_COLORS[aiAnalysisMap[m.id]!.status]} border text-[10px] py-0 px-1`}>
                            {AI_STATUS_LABELS[aiAnalysisMap[m.id]!.status]}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-rose-600"
                        onClick={() => remove(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {m.notes && (
                  <CardContent className="pt-0">
                    <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Notas</div>
                    <div className="text-xs text-stone-700 whitespace-pre-wrap line-clamp-6 bg-stone-50 rounded p-2 border border-stone-100">
                      {m.notes}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog nueva reunión — nota grande dividida por áreas */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva reunión de coordinación</DialogTitle>
            <DialogDescription>
              Escribe TODAS las notas en el campo grande de abajo, divididas por área con el formato:
              <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs ml-1">{'=== Panamericano A ==='}</code>
              La IA detectará automáticamente las áreas, investigadores y bautismos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.meetingDate}
                  onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Líder que preside</Label>
                <Input
                  value={form.leader}
                  onChange={(e) => setForm({ ...form, leader: e.target.value })}
                  placeholder="Líder Misional de Barrio"
                />
              </div>
              <div>
                <Label>Asistentes</Label>
                <Input
                  value={form.attendees}
                  onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                  placeholder="Elderes de las 3 áreas, Obispo, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Visión / enfoque de la semana</Label>
                <Textarea
                  rows={2}
                  value={form.vision}
                  onChange={(e) => setForm({ ...form, vision: e.target.value })}
                  placeholder="Enfoque general de la semana..."
                />
              </div>
              <div>
                <Label>Prioridades</Label>
                <Textarea
                  rows={2}
                  value={form.priorities}
                  onChange={(e) => setForm({ ...form, priorities: e.target.value })}
                  placeholder="1. ... 2. ..."
                />
              </div>
            </div>

            {/* NOTAS GRANDES DIVIDIDAS POR ÁREA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-medium">
                  Notas por área{' '}
                  <span className="text-xs text-stone-500 font-normal">
                    (escribe aquí TODO — la IA detectará áreas, investigadores y bautismos)
                  </span>
                </Label>
                {areas.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ ...form, notes: generateNotesTemplate() })}
                  >
                    Generar plantilla
                  </Button>
                )}
              </div>
              <Textarea
                rows={18}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={`Ejemplo:\n\n=== Panamericano A ===\nFamilia Ornelas madre y 4 hijos se bautisan el 28 de junio...\n\n=== Panamericano B ===\nHermana Pancha y hermano David...\n\n=== Panamericano C ===\nKorina y su hijo Edén...`}
                className="font-mono text-sm"
              />
              <div className="text-xs text-stone-400 mt-1">
                {form.notes.length} caracteres · {form.notes.split('\n').length} líneas
              </div>
            </div>

            <div>
              <Label>Compromisos generales</Label>
              <Textarea
                rows={2}
                value={form.commitments}
                onChange={(e) => setForm({ ...form, commitments: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={save}>Guardar reunión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de análisis con IA */}
      <AIAnalysisModal
        meetingId={aiModalMeetingId}
        open={!!aiModalMeetingId}
        onOpenChange={(o) => {
          if (!o) setAiModalMeetingId(null)
          else if (aiModalMeetingId) loadAIStatuses([aiModalMeetingId])
        }}
      />
    </div>
  )
}
