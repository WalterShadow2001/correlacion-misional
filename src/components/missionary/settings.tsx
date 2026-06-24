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
import { Sparkles, CheckCircle2, Loader2, AlertCircle, Plug, Save, Wand2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import type { AISettings } from '@/lib/types'

export function SettingsTab() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

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

  useEffect(() => {
    load()
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
                <SelectItem value="zai">Z.ai (Built-in, recomendado)</SelectItem>
                <SelectItem value="gemini" disabled>Google Gemini (próximamente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key opcional */}
          <div className="border-t border-stone-200 pt-4">
            <Label htmlFor="apikey" className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-stone-500" />
              API Key (opcional)
            </Label>
            <p className="text-xs text-stone-500 mt-0.5 mb-2">
              {settings.hasCustomApiKey
                ? 'Ya tienes una API key guardada. Escribe una nueva solo si quieres reemplazarla.'
                : 'El proveedor Z.ai (built-in) no requiere API key. Déjalo vacío.'}
            </p>
            <Input
              id="apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings.hasCustomApiKey ? '•••••••••••••••• (configurada)' : 'No requerida para Z.ai built-in'}
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
