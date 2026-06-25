'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, CheckCircle2, Loader2, AlertCircle, Plug, Save, Wand2, Shield, BookOpen, Trash2, Brain } from 'lucide-react'
import { toast } from 'sonner'
import type { AISettings } from '@/lib/types'

interface LessonCategory {
  category: string
  count: number
  lessons: Array<{ feedback: string; count: number; lastUsed: string }>
}
interface LessonsData {
  ok: boolean
  userCorrections: {
    total: number
    unique: number
    byCategory: LessonCategory[]
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  doctrina: 'Doctrina SUD',
  metodologia: 'Metodología',
  vocabulario: 'Vocabulario SUD',
  investigators: 'Investigadores',
  tasks: 'Tareas',
  summary: 'Resumen',
  general: 'General',
}

export function SettingsTab() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [lessons, setLessons] = useState<LessonsData | null>(null)
  const [loadingLessons, setLoadingLessons] = useState(false)

  // Form state
  const [enabled, setEnabled] = useState(true)
  const [provider, setProvider] = useState('zai')
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [apiKey, setApiKey] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/ai-settings')
      if (r.ok) {
        const data = await r.json()
        setSettings(data)
        setEnabled(data.enabled)
        setProvider(data.provider)
        setCustomSystemPrompt(data.customSystemPrompt || '')
        setApiKey('')
      }
    } catch {
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const loadLessons = async () => {
    setLoadingLessons(true)
    try {
      const r = await fetch('/api/lessons')
      if (r.ok) {
        setLessons(await r.json())
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingLessons(false)
    }
  }

  const deleteLesson = async (feedback: string) => {
    if (!confirm('¿Eliminar esta lección? La IA dejará de aplicarla.')) return
    try {
      const r = await fetch(`/api/lessons?feedback=${encodeURIComponent(feedback)}`, { method: 'DELETE' })
      if (r.ok) {
        const data = await r.json()
        toast.success(data.message)
        loadLessons()
      } else {
        toast.error('Error al eliminar')
      }
    } catch {
      toast.error('Error de red')
    }
  }

  useEffect(() => {
    load()
    loadLessons()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        enabled,
        provider,
        customSystemPrompt,
      }
      // Solo enviar apiKey si el usuario escribió algo (no vaciar la existente)
      if (apiKey.trim()) payload.apiKey = apiKey.trim()

      const r = await fetch('/api/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const data = await r.json()
        setSettings(data)
        setApiKey('')
        toast.success('Configuración guardada')
      } else {
        toast.error('Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch('/api/ai-settings/test', { method: 'POST' })
      const data = await r.json()
      setTestResult(data)
      if (data.ok) toast.success(data.message)
      else toast.error(data.message)
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message })
      toast.error('Error al probar la conexión')
    } finally {
      setTesting(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Status card */}
      <Card className="overflow-hidden border-violet-200">
        <CardHeader className="bg-violet-50/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Estado de la IA
            <Badge className={`ml-2 ${enabled ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'} border`}>
              {enabled ? 'Activa' : 'Inactiva'}
            </Badge>
          </CardTitle>
          <CardDescription>
            La IA procesa las notas de las reuniones de correlación y genera resúmenes, planes de acción, imágenes y preguntas de aclaración.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs text-stone-500 uppercase tracking-wide">Proveedor</div>
              <div className="font-medium mt-1 flex items-center gap-2">
                <Plug className="h-4 w-4 text-violet-600" />
                {provider === 'zai' ? 'Z.ai (Built-in)' : provider === 'gemini' ? 'Google Gemini' : provider}
              </div>
            </div>
            <div className="rounded-lg border border-stone-200 p-3">
              <div className="text-xs text-stone-500 uppercase tracking-wide">API Key</div>
              <div className="font-medium mt-1">
                {settings.hasCustomApiKey ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Configurada
                  </span>
                ) : (
                  <span className="text-stone-500">No requerida (built-in)</span>
                )}
              </div>
            </div>
          </div>

          <Button onClick={test} disabled={testing} variant="outline" className="w-full">
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {testing ? 'Probando conexión…' : 'Probar conexión con la IA'}
          </Button>

          {testResult && (
            <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
              testResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración</CardTitle>
          <CardDescription>
            Personaliza el comportamiento de la IA. La mayoría de los usuarios no necesitan cambiar nada aquí.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activar/desactivar */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div>
              <Label htmlFor="enabled" className="text-sm font-medium">IA habilitada</Label>
              <p className="text-xs text-stone-500 mt-0.5">
                Si la desactivas, el botón "IA" en las reuniones no estará disponible.
              </p>
            </div>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="border-t border-stone-200 pt-4">
            <Label htmlFor="provider" className="text-sm font-medium">Proveedor de IA</Label>
            <p className="text-xs text-stone-500 mt-0.5 mb-2">
              Z.ai funciona sin configuración adicional. Gemini requiere tu propia API key.
            </p>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zai">Z.ai (Built-in, solo desarrollo local)</SelectItem>
                <SelectItem value="gemini">Google Gemini (recomendado para producción)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key opcional */}
          <div className="border-t border-stone-200 pt-4">
            <Label htmlFor="apikey" className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-stone-500" />
              API Key de Gemini
            </Label>
            <p className="text-xs text-stone-500 mt-0.5 mb-2">
              {provider === 'gemini'
                ? 'Requerido para Gemini. Obtén tu API key gratis en https://aistudio.google.com/apikey'
                : settings.hasCustomApiKey
                  ? 'Ya tienes una API key guardada. Escribe una nueva solo si quieres reemplazarla.'
                  : 'El proveedor Z.ai (built-in) no requiere API key. Gemini sí la requiere.'}
            </p>
            <Input
              id="apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings.hasCustomApiKey ? '•••••••••••••••• (configurada)' : 'AIza...'}
            />
          </div>

          {/* Prompt personalizado */}
          <div className="border-t border-stone-200 pt-4">
            <Label htmlFor="prompt" className="text-sm font-medium">Prompt del sistema (avanzado)</Label>
            <p className="text-xs text-stone-500 mt-0.5 mb-2">
              Personaliza cómo la IA entiende su rol. Si lo dejas vacío, se usa el prompt por defecto (asistente experto en obra misional SUD).
            </p>
            <Textarea
              id="prompt"
              rows={6}
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="Ej: Eres un asistente que ayuda al líder misional de la estaca México Centro…"
            />
            <div className="text-xs text-stone-400 mt-1">
              {customSystemPrompt.length} caracteres
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-stone-200">
            <Button variant="outline" onClick={load}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lecciones aprendidas por la IA */}
      <Card className="border-violet-200">
        <CardHeader className="bg-violet-50/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600" />
            Lecciones aprendidas por la IA
            {lessons?.userCorrections && (
              <Badge variant="outline" className="ml-2 bg-violet-50 border-violet-300 text-violet-800">
                {lessons.userCorrections.unique} únicas ({lessons.userCorrections.total} total)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            La IA acumula lecciones de tus correcciones. Cada vez que corriges un análisis, la IA aprende y mejora para futuras reuniones. Las lecciones doctrinales permanentes siempre se aplican.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Lecciones permanentes (doctrina SUD) */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Lecciones permanentes (doctrina SUD — siempre activas)
            </div>
            <ul className="space-y-1.5 text-xs text-stone-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">⚠</span>
                <span><strong>Obispo NO entrevista bautismos de investigadores</strong> — eso lo hace el Líder de Distrito (LD). El Obispo solo entrevista niños de 8 años.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">⚠</span>
                <span>El Presidente de Misión autoriza bautismos, pero las entrevistas las hace LD (investigadores) u Obispo (niños de 8 años).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Debes detectar a TODAS las personas mencionadas, no solo las que se bautizan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Para cada investigador, listar TODOS los familiares (miembros y no miembros).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>"raíz" o "rait" = reunión de activación de inactivos (no bautismo).</span>
              </li>
            </ul>
          </div>

          {/* Lecciones aprendidas del usuario */}
          {loadingLessons ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            </div>
          ) : !lessons || lessons.userCorrections.total === 0 ? (
            <div className="text-center py-6 text-sm text-stone-500">
              Aún no has guardado correcciones. Cuando corrijas un análisis de IA, las lecciones aparecerán aquí.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-stone-600">
                Lecciones aprendidas de tus correcciones (las más frecuentes primero):
              </div>
              {lessons.userCorrections.byCategory.map((cat) => (
                <div key={cat.category} className="rounded-lg border border-stone-200 overflow-hidden">
                  <div className="px-3 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <Badge variant="outline" className="text-xs">{cat.count}</Badge>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {cat.lessons.map((lesson, i) => (
                      <div key={i} className="px-3 py-2 flex items-start justify-between gap-2 group">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-stone-800">{lesson.feedback}</div>
                          <div className="text-[10px] text-stone-400 mt-1">
                            Aplicada {lesson.count} vez(ces) · Última: {new Date(lesson.lastUsed).toLocaleDateString('es-MX')}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-rose-600"
                          onClick={() => deleteLesson(lesson.feedback)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-stone-50 border-stone-200">
        <CardContent className="pt-6 text-sm text-stone-600 space-y-2">
          <div className="font-medium text-stone-700">ℹ️ Cómo funciona</div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>En la pestaña <strong>Correlación</strong>, cada reunión tiene un botón <strong>IA</strong>.</li>
            <li>Al hacer clic, la IA lee todas las notas (visión, prioridades, compromisos, agenda) y genera:
              <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
                <li>Un resumen estructurado de la reunión.</li>
                <li>Un plan de acción dividido entre <strong>tareas de líderes</strong> (entrevistas, ordenanzas, llamamientos) y <strong>tareas para cualquier miembro</strong> (programas, decoración, refrigerios, música, transporte, setup).</li>
                <li>Una imagen generada que representa el espíritu de la reunión.</li>
                <li>Preguntas de aclaración si algo no quedó claro en las notas.</li>
              </ul>
            </li>
            <li>Puedes responder a las preguntas y la IA <strong>refinará</strong> el análisis con tus respuestas.</li>
            <li>Toda la información se guarda en la base de datos para consulta futura.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
