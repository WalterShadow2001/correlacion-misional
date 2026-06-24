import ZAI from 'z-ai-web-dev-sdk'
import { db } from './db'
import type { CorrelationMeeting, AgendaItem } from './types'

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
// Cliente ZAI singleton
// ========================================

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZAI() {
  if (!_zai) {
    _zai = await ZAI.create()
  }
  return _zai
}

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
  const zai = await getZAI()
  const systemPrompt = await getSystemPrompt()
  const meetingContext = buildMeetingContext(meeting)
  const userPrompt = buildAnalysisPrompt(meetingContext)

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('La IA no devolvió contenido')

  return parseAIResponse(content)
}

// ========================================
// Generar imagen de la reunión
// ========================================

export async function generateMeetingImage(prompt: string): Promise<string> {
  const zai = await getZAI()
  // Asegurar estilo editorial SUD-apropiado
  const enhanced = `${prompt}, editorial illustration style, warm peaceful lighting, no text, no faces visible, soft colors, missionary work theme, high quality`

  const response = await zai.images.generations.create({
    prompt: enhanced,
    size: '1344x768', // landscape
  })

  const base64 = response.data[0]?.base64
  if (!base64) throw new Error('La IA no devolvió la imagen')

  return `data:image/png;base64,${base64}`
}

// ========================================
// Refinar análisis con respuestas del usuario
// ========================================

export async function refineAnalysis(
  meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] },
  previousAnalysis: AIAnalysisResult,
  answers: Record<string, string>
): Promise<AIAnalysisResult> {
  const zai = await getZAI()
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

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('La IA no devolvió contenido en el refinamiento')

  return parseAIResponse(content)
}

// ========================================
// Test de conexión (para settings)
// ========================================

export async function testAIConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const zai = await getZAI()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'Eres un asistente útil. Responde en español.' },
        { role: 'user', content: 'Responde solo con la palabra: CONECTADO' },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices[0]?.message?.content || ''
    return {
      ok: true,
      message: `IA conectada correctamente. Respuesta de prueba: "${content.slice(0, 50)}"`,
    }
  } catch (e) {
    return { ok: false, message: `Error: ${(e as Error).message}` }
  }
}
