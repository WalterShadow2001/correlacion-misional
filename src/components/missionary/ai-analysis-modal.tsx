'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2, Sparkles, AlertTriangle, RefreshCw, Wand2,
  Crown, Users, HelpCircle, UserPlus, CalendarDays,
  CheckCircle2, XCircle, Edit3, Save, Plus, Trash2, ChevronDown, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  AIAnalysis, AIQuestion, SuggestedInvestigator, SuggestedBaptismEvent,
  SuggestedFamilyMember, LeadershipTask, GeneralTask
} from '@/lib/types'
import {
  AI_STATUS_LABELS, AI_STATUS_COLORS,
  GENERAL_TASK_CATEGORY_LABELS, GENERAL_TASK_CATEGORY_COLORS,
  formatDate,
} from '@/lib/labels'

interface Props {
  meetingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ApplyResult {
  ok: boolean
  summary: {
    investigatorsCreated: number
    investigatorsUpdated: number
    investigatorsSkipped: number
    familyMembersCreated: number
    baptismsUpdated: number
    baptismsSkipped: number
  }
  details: {
    investigators: Array<{ name: string; area: string; status: string; created: boolean; familyCreated?: number; reason?: string }>
    baptisms: Array<{ investigator: string; date: string; tentative: boolean; updated: boolean; reason?: string }>
  }
}

const PERSON_TYPE_LABELS: Record<string, string> = {
  INVESTIGADOR: 'Investigador',
  INACTIVO: 'Miembro inactivo',
  CONVERSO_RECIENTE: 'Converso reciente',
  MIEMBRO: 'Miembro',
}

const PERSON_TYPE_COLORS: Record<string, string> = {
  INVESTIGADOR: 'bg-sky-100 text-sky-800 border-sky-200',
  INACTIVO: 'bg-amber-100 text-amber-800 border-amber-200',
  CONVERSO_RECIENTE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MIEMBRO: 'bg-stone-100 text-stone-700 border-stone-200',
}

export function AIAnalysisModal({ meetingId, open, onOpenChange }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [refining, setRefining] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showRefinePanel, setShowRefinePanel] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [savingCorrections, setSavingCorrections] = useState(false)
  const [correctionNotes, setCorrectionNotes] = useState('')

  // Editable copies
  const [editedSummary, setEditedSummary] = useState('')
  const [editedLeadershipTasks, setEditedLeadershipTasks] = useState<LeadershipTask[]>([])
  const [editedGeneralTasks, setEditedGeneralTasks] = useState<GeneralTask[]>([])
  const [editedInvestigators, setEditedInvestigators] = useState<SuggestedInvestigator[]>([])
  const [expandedInvestigators, setExpandedInvestigators] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (meetingId && open) {
      loadAnalysis()
      setApplyResult(null)
      setEditMode(false)
    }
  }, [meetingId, open])

  const loadAnalysis = async () => {
    if (!meetingId) return
    setLoading(true)
    try {
      const r = await fetch(`/api/correlation/${meetingId}/analyze`)
      if (r.ok) {
        const data = await r.json()
        setAnalysis(data.analysis)
        if (data.analysis?.questions) {
          const initial: Record<string, string> = {}
          data.analysis.questions.forEach((q: AIQuestion) => {
            initial[q.id] = q.answer || ''
          })
          setAnswers(initial)
        }
        // Inicializar editable copies
        setEditedSummary(data.analysis?.summary || '')
        setEditedLeadershipTasks(data.analysis?.leadershipTasks || [])
        setEditedGeneralTasks(data.analysis?.generalTasks || [])
        setEditedInvestigators(data.analysis?.suggestedInvestigators || [])
        setCorrectionNotes(data.analysis?.correctionNotes || '')
      }
    } catch {
      toast.error('Error al cargar análisis')
    } finally {
      setLoading(false)
    }
  }

  const analyze = async () => {
    if (!meetingId) return
    setAnalyzing(true)
    setApplyResult(null)
    try {
      const r = await fetch(`/api/correlation/${meetingId}/analyze`, { method: 'POST' })
      const data = await r.json()
      if (r.ok && data.ok) {
        setAnalysis(data.analysis)
        if (data.analysis?.questions) {
          const initial: Record<string, string> = {}
          data.analysis.questions.forEach((q: AIQuestion) => {
            initial[q.id] = ''
          })
          setAnswers(initial)
        }
        setEditedSummary(data.analysis?.summary || '')
        setEditedLeadershipTasks(data.analysis?.leadershipTasks || [])
        setEditedGeneralTasks(data.analysis?.generalTasks || [])
        setEditedInvestigators(data.analysis?.suggestedInvestigators || [])
        toast.success('Análisis generado por IA')
      } else {
        toast.error(data.error || 'Error al analizar')
      }
    } catch {
      toast.error('Error de red al analizar')
    } finally {
      setAnalyzing(false)
    }
  }

  const refine = async () => {
    if (!meetingId) return
    setRefining(true)
    try {
      const r = await fetch(`/api/correlation/${meetingId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await r.json()
      if (r.ok && data.ok) {
        setAnalysis(data.analysis)
        setEditedSummary(data.analysis?.summary || '')
        setEditedLeadershipTasks(data.analysis?.leadershipTasks || [])
        setEditedGeneralTasks(data.analysis?.generalTasks || [])
        setEditedInvestigators(data.analysis?.suggestedInvestigators || [])
        setShowRefinePanel(false)
        toast.success('Análisis refinado')
      } else {
        toast.error(data.error || 'Error al refinar')
      }
    } catch {
      toast.error('Error de red al refinar')
    } finally {
      setRefining(false)
    }
  }

  const applySuggestions = async () => {
    if (!meetingId) return
    setApplying(true)
    try {
      // Si estamos en modo edición, usar las versiones editadas
      const invs = editMode ? editedInvestigators : analysis?.suggestedInvestigators || []
      const baps = analysis?.suggestedBaptismEvents || []
      const r = await fetch(`/api/correlation/${meetingId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigators: invs, baptisms: baps }),
      })
      const data = await r.json()
      if (r.ok && data.ok) {
        setApplyResult(data)
        toast.success(`Aplicado: ${data.summary.investigatorsCreated} investigadores + ${data.summary.familyMembersCreated} familiares + ${data.summary.baptismsUpdated} bautismos`)
      } else {
        toast.error(data.error || 'Error al aplicar')
      }
    } catch {
      toast.error('Error de red al aplicar')
    } finally {
      setApplying(false)
    }
  }

  const saveCorrections = async () => {
    if (!meetingId) return
    setSavingCorrections(true)
    try {
      const userCorrections = {
        summary: editedSummary,
        leadershipTasks: editedLeadershipTasks,
        generalTasks: editedGeneralTasks,
        suggestedInvestigators: editedInvestigators,
      }

      // Generar feedback automático para que la IA aprenda
      const corrections: Array<{ category: string; feedback: string }> = []
      if (correctionNotes.trim()) {
        corrections.push({ category: 'general', feedback: correctionNotes.trim() })
      }

      // Comparar cambios
      if (analysis?.suggestedInvestigators && editedInvestigators.length !== analysis.suggestedInvestigators.length) {
        const diff = editedInvestigators.length - analysis.suggestedInvestigators.length
        corrections.push({
          category: 'investigators',
          feedback: diff > 0
            ? `El usuario agregó ${diff} investigador(es) que la IA no detectó. Debe ser más exhaustivo al identificar personas.`
            : `El usuario eliminó ${Math.abs(diff)} investigador(es) que la IA sugirió. Debe ser más preciso.`,
        })
      }

      const r = await fetch(`/api/correlation/${meetingId}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCorrections: JSON.stringify(userCorrections),
          correctionNotes: correctionNotes.trim() || null,
          corrections,
        }),
      })
      const data = await r.json()
      if (r.ok && data.ok) {
        toast.success(data.message || 'Correcciones guardadas. La IA aprenderá para futuros análisis.')
        setEditMode(false)
      } else {
        toast.error(data.error || 'Error al guardar correcciones')
      }
    } catch {
      toast.error('Error de red al guardar')
    } finally {
      setSavingCorrections(false)
    }
  }

  // Funciones para editar listas
  const addLeadershipTask = () => {
    setEditedLeadershipTasks([...editedLeadershipTasks, { task: '', who: '', dueDate: null, rationale: '' }])
  }
  const updateLeadershipTask = (i: number, field: keyof LeadershipTask, value: string) => {
    const copy = [...editedLeadershipTasks]
    copy[i] = { ...copy[i], [field]: value || null }
    setEditedLeadershipTasks(copy)
  }
  const removeLeadershipTask = (i: number) => {
    setEditedLeadershipTasks(editedLeadershipTasks.filter((_, idx) => idx !== i))
  }

  const addGeneralTask = () => {
    setEditedGeneralTasks([...editedGeneralTasks, { task: '', who: '', category: 'OTRO', description: '' }])
  }
  const updateGeneralTask = (i: number, field: keyof GeneralTask, value: string) => {
    const copy = [...editedGeneralTasks]
    copy[i] = { ...copy[i], [field]: value }
    setEditedGeneralTasks(copy)
  }
  const removeGeneralTask = (i: number) => {
    setEditedGeneralTasks(editedGeneralTasks.filter((_, idx) => idx !== i))
  }

  const addInvestigator = () => {
    setEditedInvestigators([...editedInvestigators, {
      firstName: '', lastName: '', areaName: 'Panamericano A',
      status: 'NUEVO', personType: 'INVESTIGADOR',
      baptismGoalDate: null, baptismDate: null,
      phone: null, address: null, source: null, referredBy: null,
      notes: '', rationale: '', familyMembers: []
    }])
  }
  const updateInvestigator = (i: number, field: keyof SuggestedInvestigator, value: string) => {
    const copy = [...editedInvestigators]
    (copy[i] as Record<string, unknown>)[field] = value || null
    setEditedInvestigators(copy)
  }
  const removeInvestigator = (i: number) => {
    setEditedInvestigators(editedInvestigators.filter((_, idx) => idx !== i))
  }

  const addFamilyMember = (invIdx: number) => {
    const copy = [...editedInvestigators]
    if (!copy[invIdx].familyMembers) copy[invIdx].familyMembers = []
    copy[invIdx].familyMembers!.push({ name: '', age: null, isMember: false, isInvestigator: false, relationship: '', notes: '' })
    setEditedInvestigators(copy)
  }
  const updateFamilyMember = (invIdx: number, fmIdx: number, field: keyof SuggestedFamilyMember, value: string | boolean | number) => {
    const copy = [...editedInvestigators]
    if (!copy[invIdx].familyMembers) return
    (copy[invIdx].familyMembers![fmIdx] as Record<string, unknown>)[field] = value
    setEditedInvestigators(copy)
  }
  const removeFamilyMember = (invIdx: number, fmIdx: number) => {
    const copy = [...editedInvestigators]
    if (!copy[invIdx].familyMembers) return
    copy[invIdx].familyMembers = copy[invIdx].familyMembers!.filter((_, idx) => idx !== fmIdx)
    setEditedInvestigators(copy)
  }

  const toggleInvestigator = (i: number) => {
    const copy = new Set(expandedInvestigators)
    if (copy.has(i)) copy.delete(i)
    else copy.add(i)
    setExpandedInvestigators(copy)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-stone-200">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Análisis con IA de la reunión
            {analysis && (
              <Badge className={`ml-2 ${AI_STATUS_COLORS[analysis.status]} border`}>
                {AI_STATUS_LABELS[analysis.status]}
              </Badge>
            )}
            {analysis && analysis.status !== 'PROCESANDO' && analysis.status !== 'ERROR' && (
              <Button
                size="sm"
                variant={editMode ? 'default' : 'outline'}
                className="ml-auto h-7"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? <Save className="h-3.5 w-3.5 mr-1" /> : <Edit3 className="h-3.5 w-3.5 mr-1" />}
                {editMode ? 'Editando' : 'Editar'}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? 'Modo edición: corrige lo que sea necesario. Al guardar, la IA aprenderá de tus correcciones.'
              : 'La IA organiza las notas y genera: resumen, plan de acción, imagen, investigadores y bautismos. Puedes editar todo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            </div>
          ) : !analysis ? (
            <div className="px-6 py-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Sin análisis aún</h3>
                <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
                  La IA (Pollinations, gratis) analizará todas las notas y generará un plan completo con investigadores, familias y bautismos.
                </p>
              </div>
              <Button onClick={analyze} disabled={analyzing} size="lg">
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {analyzing ? 'Analizando con IA…' : 'Analizar con IA'}
              </Button>
              {analyzing && (
                <p className="text-xs text-stone-400">
                  Esto puede tardar 30-90 segundos (2 llamadas a la IA).
                </p>
              )}
            </div>
          ) : analysis.status === 'ERROR' ? (
            <div className="px-6 py-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Error en el análisis</h3>
                <p className="text-sm text-rose-600 mt-1 max-w-md mx-auto">{analysis.error}</p>
              </div>
              <Button onClick={analyze} disabled={analyzing} variant="outline">
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Reintentar
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(92vh-180px)]">
              <div className="px-6 py-4 space-y-5">
                {/* Imagen */}
                {analysis.imageDataUrl && !editMode && (
                  <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                    <div className="aspect-[1344/768] bg-stone-100">
                      <img
                        src={analysis.imageDataUrl}
                        alt={analysis.imageDescription || 'Imagen'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {analysis.imageDescription && (
                      <div className="px-4 py-2 text-xs text-stone-600 italic">
                        {analysis.imageDescription}
                      </div>
                    )}
                  </div>
                )}

                {/* RESUMEN */}
                <div>
                  <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Resumen
                  </h3>
                  {editMode ? (
                    <Textarea
                      rows={10}
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none text-stone-800 whitespace-pre-wrap bg-stone-50 rounded-lg p-4 border border-stone-200">
                      {editedSummary}
                    </div>
                  )}
                </div>

                {/* PLAN DE ACCIÓN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lideres */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-100/70 border-b border-amber-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Plan de acción para líderes
                        <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-800">
                          {editedLeadershipTasks.length}
                        </Badge>
                      </h3>
                      {editMode && (
                        <Button size="sm" variant="ghost" className="h-6 text-amber-700" onClick={addLeadershipTask}>
                          <Plus className="h-3 w-3 mr-1" /> Agregar
                        </Button>
                      )}
                    </div>
                    <div className="divide-y divide-amber-100 max-h-80 overflow-y-auto">
                      {editedLeadershipTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-amber-700">
                          No hay tareas de líderes.
                        </div>
                      ) : (
                        editedLeadershipTasks.map((t, i) => (
                          <div key={i} className="px-4 py-3">
                            {editMode ? (
                              <div className="space-y-2">
                                <Input
                                  value={t.task}
                                  onChange={(e) => updateLeadershipTask(i, 'task', e.target.value)}
                                  placeholder="Tarea"
                                  className="text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={t.who || ''}
                                    onChange={(e) => updateLeadershipTask(i, 'who', e.target.value)}
                                    placeholder="Quién (rol)"
                                    className="text-xs h-8"
                                  />
                                  <Input
                                    type="date"
                                    value={t.dueDate || ''}
                                    onChange={(e) => updateLeadershipTask(i, 'dueDate', e.target.value)}
                                    className="text-xs h-8"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={t.rationale || ''}
                                    onChange={(e) => updateLeadershipTask(i, 'rationale', e.target.value)}
                                    placeholder="Razón"
                                    className="text-xs h-8 flex-1"
                                  />
                                  <Button size="sm" variant="ghost" className="text-rose-600 h-8" onClick={() => removeLeadershipTask(i)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-medium text-sm text-stone-800">{t.task}</div>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                  <Badge variant="outline" className="bg-white border-amber-300 text-amber-800">{t.who}</Badge>
                                  {t.dueDate && (
                                    <Badge variant="outline" className="bg-white border-stone-300 text-stone-700">📅 {formatDate(t.dueDate)}</Badge>
                                  )}
                                </div>
                                {t.rationale && <div className="text-xs text-stone-600 mt-1.5 italic">{t.rationale}</div>}
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cualquier miembro */}
                  <div className="rounded-xl border border-teal-200 bg-teal-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-teal-100/70 border-b border-teal-200 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-teal-900 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Tareas para cualquier miembro
                        <Badge variant="outline" className="bg-teal-50 border-teal-300 text-teal-800">
                          {editedGeneralTasks.length}
                        </Badge>
                      </h3>
                      {editMode && (
                        <Button size="sm" variant="ghost" className="h-6 text-teal-700" onClick={addGeneralTask}>
                          <Plus className="h-3 w-3 mr-1" /> Agregar
                        </Button>
                      )}
                    </div>
                    <div className="divide-y divide-teal-100 max-h-80 overflow-y-auto">
                      {editedGeneralTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-teal-700">
                          No hay tareas generales.
                        </div>
                      ) : (
                        editedGeneralTasks.map((t, i) => (
                          <div key={i} className="px-4 py-3">
                            {editMode ? (
                              <div className="space-y-2">
                                <Input
                                  value={t.task}
                                  onChange={(e) => updateGeneralTask(i, 'task', e.target.value)}
                                  placeholder="Tarea"
                                  className="text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={t.who || ''}
                                    onChange={(e) => updateGeneralTask(i, 'who', e.target.value)}
                                    placeholder="Quién"
                                    className="text-xs h-8"
                                  />
                                  <select
                                    value={t.category}
                                    onChange={(e) => updateGeneralTask(i, 'category', e.target.value)}
                                    className="text-xs h-8 rounded border border-stone-200 px-2"
                                  >
                                    {Object.entries(GENERAL_TASK_CATEGORY_LABELS).map(([k, v]) => (
                                      <option key={k} value={k}>{v}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={t.description || ''}
                                    onChange={(e) => updateGeneralTask(i, 'description', e.target.value)}
                                    placeholder="Detalle"
                                    className="text-xs h-8 flex-1"
                                  />
                                  <Button size="sm" variant="ghost" className="text-rose-600 h-8" onClick={() => removeGeneralTask(i)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-medium text-sm text-stone-800">{t.task}</div>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                  <Badge className={`border ${GENERAL_TASK_CATEGORY_COLORS[t.category] || GENERAL_TASK_CATEGORY_COLORS.OTRO}`}>
                                    {GENERAL_TASK_CATEGORY_LABELS[t.category] || t.category}
                                  </Badge>
                                  {t.who && <Badge variant="outline" className="bg-white border-teal-300 text-teal-800">{t.who}</Badge>}
                                </div>
                                {t.description && <div className="text-xs text-stone-600 mt-1.5 italic">{t.description}</div>}
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* INVESTIGADORES Y FAMILIAS */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
                  <div className="px-4 py-3 bg-sky-100/70 border-b border-sky-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Personas detectadas (investigadores, inactivos, familias)
                      <Badge variant="outline" className="bg-sky-50 border-sky-300 text-sky-800">
                        {editedInvestigators.length}
                      </Badge>
                    </h3>
                    {editMode && (
                      <Button size="sm" variant="ghost" className="h-6 text-sky-700" onClick={addInvestigator}>
                        <Plus className="h-3 w-3 mr-1" /> Agregar
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-sky-100 max-h-96 overflow-y-auto">
                    {editedInvestigators.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-sky-700">
                        No se detectaron personas. {editMode && 'Puedes agregar manualmente.'}
                      </div>
                    ) : (
                      editedInvestigators.map((inv, i) => {
                        const expanded = expandedInvestigators.has(i)
                        return (
                          <div key={i} className="px-4 py-3">
                            {editMode ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <Input
                                    value={inv.firstName}
                                    onChange={(e) => updateInvestigator(i, 'firstName', e.target.value)}
                                    placeholder="Nombre"
                                    className="text-sm h-8"
                                  />
                                  <Input
                                    value={inv.lastName}
                                    onChange={(e) => updateInvestigator(i, 'lastName', e.target.value)}
                                    placeholder="Apellido"
                                    className="text-sm h-8"
                                  />
                                  <Input
                                    value={inv.areaName}
                                    onChange={(e) => updateInvestigator(i, 'areaName', e.target.value)}
                                    placeholder="Área"
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <select
                                    value={inv.status}
                                    onChange={(e) => updateInvestigator(i, 'status', e.target.value)}
                                    className="text-xs h-8 rounded border border-stone-200 px-2"
                                  >
                                    <option value="NUEVO">Nuevo</option>
                                    <option value="EN_PROGRESO">En progreso</option>
                                    <option value="FECHA_BAUTISMO">Fecha de bautismo</option>
                                    <option value="BAUTIZADO">Bautizado</option>
                                    <option value="INACTIVO">Inactivo</option>
                                  </select>
                                  <select
                                    value={inv.personType || 'INVESTIGADOR'}
                                    onChange={(e) => updateInvestigator(i, 'personType', e.target.value)}
                                    className="text-xs h-8 rounded border border-stone-200 px-2"
                                  >
                                    <option value="INVESTIGADOR">Investigador</option>
                                    <option value="INACTIVO">Miembro inactivo</option>
                                    <option value="CONVERSO_RECIENTE">Converso reciente</option>
                                    <option value="MIEMBRO">Miembro</option>
                                  </select>
                                  <Input
                                    type="date"
                                    value={inv.baptismGoalDate || ''}
                                    onChange={(e) => updateInvestigator(i, 'baptismGoalDate', e.target.value)}
                                    className="text-xs h-8"
                                  />
                                </div>
                                <Input
                                  value={inv.notes || ''}
                                  onChange={(e) => updateInvestigator(i, 'notes', e.target.value)}
                                  placeholder="Notas"
                                  className="text-xs h-8"
                                />
                                {/* Familiares */}
                                <div className="border-l-2 border-stone-200 pl-2 ml-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-stone-600">Familiares ({inv.familyMembers?.length || 0})</span>
                                    <Button size="sm" variant="ghost" className="h-5 text-xs" onClick={() => addFamilyMember(i)}>
                                      <Plus className="h-3 w-3 mr-1" /> Familiar
                                    </Button>
                                  </div>
                                  {inv.familyMembers?.map((fm, fmIdx) => (
                                    <div key={fmIdx} className="grid grid-cols-12 gap-1 items-center">
                                      <Input
                                        value={fm.name}
                                        onChange={(e) => updateFamilyMember(i, fmIdx, 'name', e.target.value)}
                                        placeholder="Nombre"
                                        className="col-span-4 text-xs h-7"
                                      />
                                      <Input
                                        value={fm.relationship || ''}
                                        onChange={(e) => updateFamilyMember(i, fmIdx, 'relationship', e.target.value)}
                                        placeholder="Relación"
                                        className="col-span-3 text-xs h-7"
                                      />
                                      <Input
                                        type="number"
                                        value={fm.age || ''}
                                        onChange={(e) => updateFamilyMember(i, fmIdx, 'age', Number(e.target.value) || 0)}
                                        placeholder="Edad"
                                        className="col-span-2 text-xs h-7"
                                      />
                                      <label className="col-span-2 flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={fm.isMember}
                                          onChange={(e) => updateFamilyMember(i, fmIdx, 'isMember', e.target.checked)}
                                        />
                                        Miembro
                                      </label>
                                      <Button size="sm" variant="ghost" className="col-span-1 text-rose-600 h-7 p-0" onClick={() => removeFamilyMember(i, fmIdx)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                <Button size="sm" variant="ghost" className="text-rose-600 h-6" onClick={() => removeInvestigator(i)}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Eliminar persona
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div
                                  className="flex items-center justify-between gap-2 cursor-pointer"
                                  onClick={() => inv.familyMembers && inv.familyMembers.length > 0 && toggleInvestigator(i)}
                                >
                                  <div className="flex items-center gap-2">
                                    {inv.familyMembers && inv.familyMembers.length > 0 ? (
                                      expanded ? <ChevronDown className="h-4 w-4 text-stone-400" /> : <ChevronRight className="h-4 w-4 text-stone-400" />
                                    ) : null}
                                    <div className="font-medium text-sm">{inv.firstName} {inv.lastName}</div>
                                    {inv.personType && (
                                      <Badge className={`text-xs ${PERSON_TYPE_COLORS[inv.personType] || PERSON_TYPE_COLORS.MIEMBRO} border`}>
                                        {PERSON_TYPE_LABELS[inv.personType] || inv.personType}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="bg-white border-sky-300 text-sky-800 text-xs">{inv.areaName}</Badge>
                                    {inv.baptismGoalDate && (
                                      <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-800 text-xs">
                                        📅 {formatDate(inv.baptismGoalDate)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {inv.notes && <div className="text-xs text-stone-600 mt-1 italic ml-6">{inv.notes}</div>}
                                {expanded && inv.familyMembers && inv.familyMembers.length > 0 && (
                                  <div className="mt-2 ml-6 space-y-1">
                                    <div className="text-xs text-stone-500 uppercase tracking-wide">Familia</div>
                                    {inv.familyMembers.map((fm, fmIdx) => (
                                      <div key={fmIdx} className="text-xs flex items-center gap-2 bg-white rounded px-2 py-1 border border-stone-100">
                                        <span className="font-medium">{fm.name}</span>
                                        {fm.relationship && <span className="text-stone-500">· {fm.relationship}</span>}
                                        {fm.age && <span className="text-stone-500">· {fm.age} años</span>}
                                        <span className="ml-auto flex items-center gap-1">
                                          {fm.isMember && <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700 text-[10px]">Miembro</Badge>}
                                          {fm.isInvestigator && <Badge variant="outline" className="bg-sky-50 border-sky-300 text-sky-700 text-[10px]">Investigador</Badge>}
                                          {!fm.isMember && !fm.isInvestigator && <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-[10px]">No miembro</Badge>}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* BAUTISMOS */}
                {analysis.suggestedBaptismEvents && analysis.suggestedBaptismEvents.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-emerald-100/70 border-b border-emerald-200">
                      <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Bautismos (se agregarán al calendario)
                        <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-800">
                          {analysis.suggestedBaptismEvents.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="divide-y divide-emerald-100">
                      {analysis.suggestedBaptismEvents.map((b: SuggestedBaptismEvent, i: number) => (
                        <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{b.investigatorName}</div>
                            <div className="text-xs text-stone-500">{b.areaName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-800 text-xs">
                              📅 {formatDate(b.date)}
                            </Badge>
                            <Badge className={`text-xs ${b.isTentative ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-600 text-white border-emerald-700'} border`}>
                              {b.isTentative ? 'Tentativo' : 'Confirmado'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultado de aplicar */}
                {applyResult && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                    <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Sugerencias aplicadas
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{applyResult.summary.investigatorsCreated} investigadores creados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{applyResult.summary.familyMembersCreated} familiares creados</span>
                      </div>
                      {applyResult.summary.investigatorsUpdated > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                          <span>{applyResult.summary.investigatorsUpdated} actualizados</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{applyResult.summary.baptismsUpdated} bautismos actualizados</span>
                      </div>
                      {applyResult.summary.investigatorsSkipped > 0 && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5 text-amber-500" />
                          <span>{applyResult.summary.investigatorsSkipped} ya existían</span>
                        </div>
                      )}
                      {applyResult.summary.baptismsSkipped > 0 && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5 text-amber-500" />
                          <span>{applyResult.summary.baptismsSkipped} bautismos no aplicables</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botones de acción principales */}
                <div className="flex flex-wrap gap-2">
                  {!editMode && (
                    <Button
                      onClick={applySuggestions}
                      disabled={applying}
                      className="flex-1"
                      size="lg"
                    >
                      {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      {applying ? 'Aplicando…' : `Aplicar al sistema (${editedInvestigators.length} personas + ${analysis.suggestedBaptismEvents?.length || 0} bautismos)`}
                    </Button>
                  )}
                </div>

                {/* Preguntas de aclaración */}
                {analysis.questions.length > 0 && !editMode && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-sky-100/70 border-b border-sky-200">
                      <h3 className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Preguntas de aclaración
                      </h3>
                    </div>
                    <div className="divide-y divide-sky-100">
                      {analysis.questions.map((q) => (
                        <div key={q.id} className="px-4 py-3">
                          <div className="font-medium text-sm text-stone-800">{q.question}</div>
                          {q.context && <div className="text-xs text-stone-500 mt-1 italic">{q.context}</div>}
                          {!showRefinePanel ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {q.options.map((opt, oi) => (
                                <button
                                  key={oi}
                                  onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                    answers[q.id] === opt
                                      ? 'bg-sky-600 text-white border-sky-600'
                                      : 'bg-white text-sky-800 border-sky-300 hover:bg-sky-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <Textarea
                              rows={2}
                              value={answers[q.id] || ''}
                              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                              placeholder="Tu respuesta…"
                              className="mt-2 bg-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 bg-white border-t border-sky-200 flex items-center justify-between">
                      <Button size="sm" variant="ghost" onClick={() => setShowRefinePanel(!showRefinePanel)}>
                        {showRefinePanel ? 'Opciones rápidas' : 'Texto libre'}
                      </Button>
                      <Button size="sm" onClick={refine} disabled={refining}>
                        {refining ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                        Refinar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notas de corrección (modo edición) */}
                {editMode && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                    <Label className="text-sm font-medium text-violet-900">
                      Notas para que la IA aprenda (opcional)
                    </Label>
                    <p className="text-xs text-stone-500 mt-1 mb-2">
                      Describe qué estuvo mal para que la IA no repita el error en futuros análisis.
                    </p>
                    <Textarea
                      rows={3}
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      placeholder="Ej: 'Faltó incluir a Alejandra García como inactiva. Siempre incluir a TODAS las personas mencionadas, no solo las que se bautizan.'"
                    />
                  </div>
                )}

                {analysis.updatedAt && (
                  <div className="text-xs text-stone-400 text-center">
                    Última actualización: {formatDate(analysis.updatedAt)}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {editMode && (
            <Button onClick={saveCorrections} disabled={savingCorrections}>
              {savingCorrections ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar correcciones
            </Button>
          )}
          {analysis && analysis.status !== 'PROCESANDO' && !editMode && (
            <Button onClick={analyze} disabled={analyzing} variant="outline">
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Re-analizar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
