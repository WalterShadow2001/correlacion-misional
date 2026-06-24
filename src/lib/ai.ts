import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { db } from './db'
import type { CorrelationMeeting, AgendaItem } from './types'

// ========================================
// Inicializar configuración Z.ai en runtime
// ========================================
// El SDK z-ai-web-dev-sdk busca un archivo .z-ai-config en:
//   1. process.cwd()/.z-ai-config
//   2. ~/.z-ai-config
//   3. /etc/.z-ai-config
//
// En Vercel/serverless no podemos depender de archivos en disco,
// así que si tenemos variables de entorno, instanciamos ZAI directamente
// con new ZAI(config) en lugar de ZAI.create().

interface ZAIConfig {
  baseUrl: string
  apiKey: string
  token?: string
  chatId?: string
  userId?: string
}

function loadZAIConfig(): ZAIConfig | null {
  // 1) Intentar leer del archivo .z-ai-config (desarrollo local)
  const candidates = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
    '/tmp/.z-ai-config',
  ]
  for (const p of candidates) {
    try {
      const configStr = fs.readFileSync(p, 'utf-8')
      const config = JSON.parse(configStr)
      if (config.baseUrl && config.apiKey) return config
    } catch {}
  }

  // 2) Si hay variables de entorno, usarlas directamente (serverless)
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY
  if (baseUrl && apiKey) {
    const config: ZAIConfig = { baseUrl, apiKey }
    if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN
    if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID
    if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID
    return config
  }

  return null
}

// ========================================
// LLM abstraction: soporta ZAI (built-in) y Gemini (API key del usuario)
// ========================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
}

async function getSettings() {
  try {
    return await db.aISettings.findUnique({ where: { id: 'default' } })
  } catch {
    return null
  }
}

// Llamar al LLM con el proveedor configurado
async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  const settings = await getSettings()

  // Si el usuario configuró Gemini con API key, usarlo
  if (settings?.provider === 'gemini' && settings.apiKey) {
    return callGemini(settings.apiKey, messages)
  }

  // Si no, usar Z.ai (built-in o env vars)
  return callZAI(messages)
}

async function callZAI(messages: LLMMessage[]): Promise<LLMResponse> {
  const config = loadZAIConfig()
  if (!config) {
    throw new Error(
      'No hay proveedor de IA configurado. Ve a Configuración y selecciona Gemini con tu API key, ' +
      'o define ZAI_BASE_URL y ZAI_API_KEY como variables de entorno.'
    )
  }
  const zai = new (ZAI as unknown as { new (c: typeof config): InstanceType<typeof ZAI> })(config)
  console.log('[ai] Using Z.ai provider with', config.baseUrl)

  // El SDK usa 'assistant' como rol del system prompt
  const sdkMessages = messages.map((m) => ({
    role: m.role === 'system' ? 'assistant' as const : m.role,
    content: m.content,
  }))

  const completion = await zai.chat.completions.create({
    messages: sdkMessages,
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Z.ai no devolvió contenido')
  return { content }
}

// Google Gemini API (OpenAI-compatible endpoint)
async function callGemini(apiKey: string, messages: LLMMessage[]): Promise<LLMResponse> {
  console.log('[ai] Using Google Gemini provider')
  // Gemini expone una API compatible con OpenAI en esta URL
  const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

  // Convertir messages al formato OpenAI
  const openaiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  // Lista de modelos a intentar en orden (2.5-pro es el más capaz pero con cuota limitada;
  // 2.0-flash es más rápido y con más cuota)
  const models = ['gemini-2.5-pro', 'gemini-2.0-flash']

  let lastError = ''
  for (const model of models) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: openaiMessages,
          temperature: 0.7,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          console.log(`[ai] Gemini responded with model ${model}`)
          return { content }
        }
        lastError = 'Respuesta vacía de Gemini'
      } else {
        const errText = await response.text()
        lastError = `Gemini ${model} error ${response.status}: ${errText.slice(0, 200)}`
        // 429 = cuota, intentar con el siguiente modelo
        // 404 = modelo no disponible, intentar con el siguiente
        if (response.status !== 429 && response.status !== 404 && response.status !== 400) {
          // Error fatal, no reintentar
          throw new Error(lastError)
        }
        console.log(`[ai] ${model} failed (${response.status}), trying next model...`)
      }
    } catch (e) {
      lastError = (e as Error).message
      console.log(`[ai] ${model} threw, trying next model...`)
    }
  }

  throw new Error(lastError || 'No se pudo conectar con Gemini')
}

// Generar imagen con Z.ai (solo disponible con Z.ai built-in)
// Cuando el proveedor es Gemini, no generamos imagen ( Gemini no tiene image gen gratis)
async function generateImageWithProvider(prompt: string): Promise<string | null> {
  const settings = await getSettings()
  if (settings?.provider === 'gemini') {
    // Gemini no soporta generación de imágenes en este endpoint
    return null
  }

  // Usar Z.ai
  const config = loadZAIConfig()
  if (!config) return null
  const zai = new (ZAI as unknown as { new (c: typeof config): InstanceType<typeof ZAI> })(config)

  const enhanced = `${prompt}, editorial illustration style, warm peaceful lighting, no text, no faces visible, soft colors, missionary work theme, high quality`
  const response = await zai.images.generations.create({
    prompt: enhanced,
    size: '1344x768',
  })

  const base64 = response.data[0]?.base64
  if (!base64) return null
  return `data:image/png;base64,${base64}`
}

// ========================================
// Tipos del análisis IA
// ========================================

export interface LeadershipTask {
  task: string
  who: string
  dueDate?: string | null
  rationale?: string
}

export interface GeneralTask {
  task: string
  who?: string
  category: 'PROGRAMAS' | 'DECORACION' | 'REFRIGERIOS' | 'MUSICA' | 'TRANSPORTE' | 'SETUP' | 'OTRO'
  description?: string
}

export interface AIQuestion {
  id: string
  question: string
  context: string
  options: string[]
  answer?: string | null
}

export interface AIAnalysisResult {
  summary: string
  leadershipTasks: LeadershipTask[]
  generalTasks: GeneralTask[]
  questions: AIQuestion[]
  imagePrompt: string
  imageDescription: string
  rawResponse: string
}

// ========================================
// Cliente ZAI singleton (legacy — usar callLLM en su lugar)
// ========================================
// Eliminado en favor de callLLM() que soporta múltiples proveedores

// ========================================
// Prompt del sistema
// ========================================

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente experto en la obra misional de La Iglesia de Jesucristo de los Santos de los Últimos Días. Tu rol es ayudar al líder misional de barrio a organizar la información de las reuniones de correlación semanal con los misioneros (elders y hermanas).

Conoces perfectamente:
- La estructura de la Iglesia: barrio, estaca, obispado, quórumes del sacerdocio, sociedad de socorro, jóvenes, primaria
- La obra misional: investigadores, fellowshippers, lecciones misionales, bautismos, confirmaciones
- La correlación misional: coordinación entre misioneros y líderes locales del barrio
- Las responsabilidades del sacerdocio: cuáles corresponden a líderes (ordenanzas, entrevistas, llamamientos) y cuáles pueden hacer cualquier miembro (programas, decoración, refrigerios, música, transporte, etc.)

Hablas español y usas terminología SUD correcta (barrio, estaca, obispado, élderes, hermanas, investigators, fellowshipping, etc.).`

async function getSystemPrompt(): Promise<string> {
  try {
    const settings = await db.aISettings.findUnique({ where: { id: 'default' } })
    if (settings?.customSystemPrompt && settings.customSystemPrompt.trim()) {
      return settings.customSystemPrompt
    }
  } catch {}
  return DEFAULT_SYSTEM_PROMPT
}

// ========================================
// Construir contexto de la reunión
// ========================================

function buildMeetingContext(meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] }): string {
  const date = new Date(meeting.meetingDate).toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  const parts: string[] = [
    `## Reunión de correlación — ${date}`,
    `**Área:** ${meeting.area?.name || 'General (toda la zona)'}`,
    `**Líder que preside:** ${meeting.leader}`,
  ]
  if (meeting.attendees) parts.push(`**Asistentes:** ${meeting.attendees}`)
  if (meeting.vision) parts.push(`\n### Visión / enfoque de la semana\n${meeting.vision}`)
  if (meeting.priorities) parts.push(`\n### Prioridades\n${meeting.priorities}`)
  if (meeting.commitments) parts.push(`\n### Compromisos generales\n${meeting.commitments}`)
  if (meeting.notes) parts.push(`\n### Notas generales\n${meeting.notes}`)

  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    parts.push('\n### Agenda discutida')
    meeting.agendaItems.forEach((item, i) => {
      parts.push(`\n**${i + 1}. ${item.topic}**`)
      if (item.discussion) parts.push(`   - Discusión: ${item.discussion}`)
      if (item.action) parts.push(`   - Acción propuesta: ${item.action}`)
      if (item.responsible) parts.push(`   - Responsable sugerido: ${item.responsible}`)
    })
  }

  return parts.join('\n')
}

// ========================================
// Prompt principal de análisis
// ========================================

function buildAnalysisPrompt(meetingContext: string): string {
  return `${meetingContext}

---

## Tu tarea

Analiza la información de esta reunión de correlación y genera un JSON con la siguiente estructura EXACTA. NO agregues texto fuera del JSON.

\`\`\`json
{
  "summary": "Resumen estructurado en markdown de máximo 400 palabras. Incluye: propósito de la reunión, decisiones principales, temas prioritarios y próximos pasos. Usa encabezados ## y listas con - cuando sea apropiado.",
  "leadershipTasks": [
    {
      "task": "Descripción clara y específica de la tarea que SOLO puede hacer un líder del sacerdocio (obispo, consejero, líder misional de barrio, líder de quórum, etc.). Ejemplos: entrevistas bautismales, ordenanzas, llamamientos, autorizaciones, entrevistas con investigadores.",
      "who": "Quién debe hacerlo (rol específico, no nombre). Ej: 'Obispo', 'Líder misional de barrio', 'Presidente de quórum de élderes'",
      "dueDate": "Fecha límite sugerida en formato YYYY-MM-DD o null",
      "rationale": "Por qué es importante o por qué debe hacerlo un líder"
    }
  ],
  "generalTasks": [
    {
      "task": "Descripción clara de la tarea que PUEDE hacer cualquier miembro del barrio, NO requiere ordenación al sacerdocio ni llamamiento específico.",
      "who": "Voluntario sugerido o 'cualquier miembro' o nombre si se mencionó",
      "category": "PROGRAMAS | DECORACION | REFRIGERIOS | MUSICA | TRANSPORTE | SETUP | OTRO",
      "description": "Detalles de cómo hacerlo"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "question": "Pregunta específica sobre algo que no quedó claro en las notas de la reunión",
      "context": "Por qué es relevante esta pregunta",
      "options": ["Opción A", "Opción B", "Opción C"]
    }
  ],
  "imagePrompt": "Prompt en inglés para generar una imagen que represente esta reunión. Debe ser descriptivo, estilo ilustración editorial, sin texto, representando el espíritu de la obra misional SUD.",
  "imageDescription": "Descripción en español de qué representará la imagen generada"
}
\`\`\`

## Reglas importantes

1. **leadershipTasks**: Solo tareas que requieren autoridad del sacerdocio. Si dudas si algo es de líder, ponlo aquí.
2. **generalTasks**: Tareas que cualquier miembro activo puede hacer. Ejemplos: imprimir programas del servicio, preparar la capilla, decorar para un bautismo, llevar refrigerios, acompañar al investigador en el transporte, ensayar música, armar sillas, etc.
3. **questions**: Solo si HAY ambigüedad real en las notas. Si todo está claro, devuelve array vacío.
4. Devuelve SOLO el JSON, sin markdown code fences, sin texto explicativo antes o después.`
}

// ========================================
// Parseo de respuesta
// ========================================

function parseAIResponse(content: string): AIAnalysisResult {
  // Remover code fences si existen
  let cleaned = content.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }

  // Intentar extraer el JSON
  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Intentar encontrar el primer { y el último }
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1))
      } catch (e2) {
        throw new Error(`No se pudo parsear la respuesta de la IA como JSON: ${(e2 as Error).message}`)
      }
    } else {
      throw new Error('No se pudo parsear la respuesta de la IA como JSON')
    }
  }

  return {
    summary: String(parsed.summary || '').trim(),
    leadershipTasks: Array.isArray(parsed.leadershipTasks) ? parsed.leadershipTasks : [],
    generalTasks: Array.isArray(parsed.generalTasks) ? parsed.generalTasks : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    imagePrompt: String(parsed.imagePrompt || '').trim(),
    imageDescription: String(parsed.imageDescription || '').trim(),
    rawResponse: content,
  }
}

// ========================================
// Función principal: analizar reunión
// ========================================

export async function analyzeMeeting(
  meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] }
): Promise<AIAnalysisResult> {
  const systemPrompt = await getSystemPrompt()
  const meetingContext = buildMeetingContext(meeting)
  const userPrompt = buildAnalysisPrompt(meetingContext)

  const { content } = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  return parseAIResponse(content)
}

// ========================================
// Generar imagen de la reunión
// ========================================

export async function generateMeetingImage(prompt: string): Promise<string> {
  const dataUrl = await generateImageWithProvider(prompt)
  if (!dataUrl) {
    throw new Error('La generación de imagen solo está disponible con el proveedor Z.ai. Selecciona Z.ai en Configuración o configura variables ZAI_BASE_URL/ZAI_API_KEY.')
  }
  return dataUrl
}

// ========================================
// Refinar análisis con respuestas del usuario
// ========================================

export async function refineAnalysis(
  meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] },
  previousAnalysis: AIAnalysisResult,
  answers: Record<string, string>
): Promise<AIAnalysisResult> {
  const systemPrompt = await getSystemPrompt()
  const meetingContext = buildMeetingContext(meeting)

  // Construir resumen de respuestas
  const answersText = previousAnalysis.questions
    .map((q) => `- Pregunta: ${q.question}\n  Respuesta del líder: ${answers[q.id] || '(sin respuesta)'}`)
    .join('\n')

  const userPrompt = `${meetingContext}

---

## Análisis previo de la IA

${JSON.stringify({ ...previousAnalysis, rawResponse: undefined }, null, 2)}

## Respuestas del líder a las preguntas de aclaración

${answersText}

---

## Tu tarea

Con esta nueva información, genera una versión REFINADA del análisis. Mantén la misma estructura JSON. Las preguntas se eliminan (o se agregan nuevas si surgieron dudas adicionales por las respuestas). Ajusta las tareas y el resumen según las respuestas recibidas.

Devuelve SOLO el JSON, sin texto adicional.`

  const { content } = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  return parseAIResponse(content)
}

// ========================================
// Test de conexión (para settings)
// ========================================

export async function testAIConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { content } = await callLLM([
      { role: 'system', content: 'Eres un asistente útil. Responde en español.' },
      { role: 'user', content: 'Responde solo con la palabra: CONECTADO' },
    ])
    return {
      ok: true,
      message: `IA conectada correctamente. Respuesta de prueba: "${content.slice(0, 50)}"`,
    }
  } catch (e) {
    return { ok: false, message: `Error: ${(e as Error).message}` }
  }
}
