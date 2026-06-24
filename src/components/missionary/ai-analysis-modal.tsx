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
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Sparkles, AlertTriangle, RefreshCw, Wand2, ImageIcon, Crown, Users, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { AIAnalysis, AIQuestion } from '@/lib/types'
import {
  AI_STATUS_LABELS,
  AI_STATUS_COLORS,
  GENERAL_TASK_CATEGORY_LABELS,
  GENERAL_TASK_CATEGORY_COLORS,
  formatDate,
} from '@/lib/labels'

interface Props {
  meetingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIAnalysisModal({ meetingId, open, onOpenChange }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [refining, setRefining] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showRefinePanel, setShowRefinePanel] = useState(false)

  useEffect(() => {
    if (meetingId && open) {
      loadAnalysis()
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
      }
    } catch (e) {
      toast.error('Error al cargar análisis')
    } finally {
      setLoading(false)
    }
  }

  const analyze = async () => {
    if (!meetingId) return
    setAnalyzing(true)
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
        toast.success('Análisis generado por IA')
      } else {
        toast.error(data.error || 'Error al analizar')
      }
    } catch (e) {
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
        setShowRefinePanel(false)
        if (data.analysis?.questions) {
          const initial: Record<string, string> = {}
          data.analysis.questions.forEach((q: AIQuestion) => {
            initial[q.id] = ''
          })
          setAnswers(initial)
        }
        toast.success('Análisis refinado con tus respuestas')
      } else {
        toast.error(data.error || 'Error al refinar')
      }
    } catch (e) {
      toast.error('Error de red al refinar')
    } finally {
      setRefining(false)
    }
  }

  const downloadImage = () => {
    if (!analysis?.imageDataUrl) return
    const link = document.createElement('a')
    link.href = analysis.imageDataUrl
    link.download = `reunion-${meetingId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-stone-200">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Análisis con IA de la reunión
            {analysis && (
              <Badge className={`ml-2 ${AI_STATUS_COLORS[analysis.status]} border`}>
                {AI_STATUS_LABELS[analysis.status]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            La IA organiza las notas de la reunión en: resumen, plan de acción para líderes, tareas para cualquier miembro, y preguntas de aclaración.
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
                  La IA procesará todas las notas de la reunión (visión, prioridades, compromisos, agenda) y generará un plan estructurado, una imagen y preguntas de aclaración si algo no quedó claro.
                </p>
              </div>
              <Button onClick={analyze} disabled={analyzing} size="lg">
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {analyzing ? 'Analizando con IA…' : 'Analizar con IA'}
              </Button>
              {analyzing && (
                <p className="text-xs text-stone-400">
                  Esto puede tardar 30–60 segundos. La IA está leyendo las notas y generando el análisis + la imagen.
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
                {/* Imagen generada */}
                {analysis.imageDataUrl && (
                  <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                    <div className="aspect-[1344/768] bg-stone-100">
                      <img src={analysis.imageDataUrl} alt={analysis.imageDescription || 'Imagen de la reunión'} className="w-full h-full object-cover" />
                    </div>
                    {analysis.imageDescription && (
                      <div className="px-4 py-2 text-xs text-stone-600 italic">
                        {analysis.imageDescription}
                      </div>
                    )}
                    <div className="px-4 py-2 border-t border-stone-200 flex items-center justify-between bg-white">
                      <div className="text-xs text-stone-500 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Generada por IA
                      </div>
                      <Button size="sm" variant="ghost" onClick={downloadImage} className="h-7 text-xs">
                        Descargar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resumen */}
                {analysis.summary && (
                  <div>
                    <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      Resumen de la reunión
                    </h3>
                    <div className="prose prose-sm max-w-none text-stone-800 whitespace-pre-wrap bg-stone-50 rounded-lg p-4 border border-stone-200">
                      {analysis.summary}
                    </div>
                  </div>
                )}

                {/* Plan de acción: Tareas de líderes vs Cualquiera */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tareas de líderes */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-100/70 border-b border-amber-200">
                      <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Plan de acción para líderes
                        <Badge variant="outline" className="ml-auto bg-amber-50 border-amber-300 text-amber-800">
                          {analysis.leadershipTasks.length}
                        </Badge>
                      </h3>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Solo líderes del sacerdocio (obispo, líder misional, etc.)
                      </p>
                    </div>
                    <div className="divide-y divide-amber-100">
                      {analysis.leadershipTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-amber-700">
                          No se identificaron tareas exclusivas de líderes.
                        </div>
                      ) : (
                        analysis.leadershipTasks.map((t, i) => (
                          <div key={i} className="px-4 py-3">
                            <div className="font-medium text-sm text-stone-800">{t.task}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                              <Badge variant="outline" className="bg-white border-amber-300 text-amber-800">
                                {t.who}
                              </Badge>
                              {t.dueDate && (
                                <Badge variant="outline" className="bg-white border-stone-300 text-stone-700">
                                  📅 {formatDate(t.dueDate)}
                                </Badge>
                              )}
                            </div>
                            {t.rationale && (
                              <div className="text-xs text-stone-600 mt-1.5 italic">{t.rationale}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Tareas para cualquiera */}
                  <div className="rounded-xl border border-teal-200 bg-teal-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-teal-100/70 border-b border-teal-200">
                      <h3 className="text-sm font-semibold text-teal-900 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Tareas para cualquier miembro
                        <Badge variant="outline" className="ml-auto bg-teal-50 border-teal-300 text-teal-800">
                          {analysis.generalTasks.length}
                        </Badge>
                      </h3>
                      <p className="text-xs text-teal-700 mt-0.5">
                        No requieren autoridad del sacerdocio
                      </p>
                    </div>
                    <div className="divide-y divide-teal-100">
                      {analysis.generalTasks.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-teal-700">
                          No se identificaron tareas generales.
                        </div>
                      ) : (
                        analysis.generalTasks.map((t, i) => (
                          <div key={i} className="px-4 py-3">
                            <div className="font-medium text-sm text-stone-800">{t.task}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                              <Badge className={`border ${GENERAL_TASK_CATEGORY_COLORS[t.category]}`}>
                                {GENERAL_TASK_CATEGORY_LABELS[t.category]}
                              </Badge>
                              {t.who && (
                                <Badge variant="outline" className="bg-white border-teal-300 text-teal-800">
                                  {t.who}
                                </Badge>
                              )}
                            </div>
                            {t.description && (
                              <div className="text-xs text-stone-600 mt-1.5 italic">{t.description}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Preguntas de aclaración */}
                {analysis.questions.length > 0 && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-sky-100/70 border-b border-sky-200">
                      <h3 className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Preguntas de aclaración
                        <Badge variant="outline" className="ml-auto bg-sky-50 border-sky-300 text-sky-800">
                          {analysis.questions.length}
                        </Badge>
                      </h3>
                      <p className="text-xs text-sky-700 mt-0.5">
                        La IA no entendió estos puntos. Responde para refinar el análisis.
                      </p>
                    </div>
                    <div className="divide-y divide-sky-100">
                      {analysis.questions.map((q) => (
                        <div key={q.id} className="px-4 py-3">
                          <div className="font-medium text-sm text-stone-800">{q.question}</div>
                          {q.context && (
                            <div className="text-xs text-stone-500 mt-1 italic">{q.context}</div>
                          )}
                          {!showRefinePanel ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {q.options.map((opt, i) => (
                                <button
                                  key={i}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRefinePanel(!showRefinePanel)}
                      >
                        {showRefinePanel ? 'Usar opciones rápidas' : 'Responder con texto libre'}
                      </Button>
                      <Button size="sm" onClick={refine} disabled={refining}>
                        {refining ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                        {refining ? 'Refinando…' : 'Refinar análisis con respuestas'}
                      </Button>
                    </div>
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

        <DialogFooter className="px-6 py-4 border-t border-stone-200 bg-stone-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {analysis && analysis.status !== 'PROCESANDO' && (
            <Button onClick={analyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {analyzing ? 'Analizando…' : 'Re-analizar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
