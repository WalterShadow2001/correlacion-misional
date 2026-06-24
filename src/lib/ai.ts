import { db } from './db'
import type { CorrelationMeeting, AgendaItem, Area } from './types'

// ========================================
// IA: Pollinations (gratuita, sin API key)
// ========================================
// API: https://text.pollinations.ai/openai (compatible OpenAI)
// Imágenes: https://image.pollinations.ai/prompt/{prompt}
// Ventajas:
//   - Gratis, sin API key, sin registro
//   - Funciona desde Vercel/serverless
//   - Compatible con formato OpenAI (mismo esquema de request/response)
//   - Generación de imágenes integrada
// ========================================

const POLLINATIONS_TEXT_URL = 'https://text.pollinations.ai/openai'
const POLLINATIONS_IMAGE_URL = 'https://image.pollinations.ai/prompt'
// Referrer opcional para tier prioritario (más rápido) — se puede dejar vacío
const REFERRER = 'correlacion-misional'

// ========================================
// Tipos del análisis IA
// ========================================

export interface LeadershipTask {
  task: string
  who: string
  dueDate?: string | null
  rationale?: string
}

export type GeneralTaskCategory =
  | 'PROGRAMAS'
  | 'DECORACION'
  | 'REFRIGERIOS'
  | 'MUSICA'
  | 'TRANSPORTE'
  | 'SETUP'
  | 'FELLOWSHIPPING'
  | 'MINISTRACION'
  | 'OTRO'

export interface GeneralTask {
  task: string
  who?: string
  category: GeneralTaskCategory
  description?: string
}

export interface AIQuestion {
  id: string
  question: string
  context: string
  options: string[]
  answer?: string | null
}

// Sugerencias para crear datos en el sistema
export interface SuggestedInvestigator {
  firstName: string
  lastName: string
  areaName: string  // Se buscará por nombre en la DB
  status: 'NUEVO' | 'EN_PROGRESO' | 'FECHA_BAUTISMO' | 'BAUTIZADO' | 'INACTIVO'
  baptismGoalDate?: string | null  // YYYY-MM-DD
  baptismDate?: string | null
  phone?: string | null
  address?: string | null
  source?: string | null
  referredBy?: string | null
  notes?: string | null
  rationale?: string  // por qué la IA sugiere crear este investigador
}

export interface SuggestedBaptismEvent {
  investigatorName: string
  areaName: string
  date: string  // YYYY-MM-DD
  isTentative: boolean  // true si es "tentativa", false si es confirmado
  notes?: string
}

export interface AIAnalysisResult {
  summary: string
  leadershipTasks: LeadershipTask[]
  generalTasks: GeneralTask[]
  questions: AIQuestion[]
  imagePrompt: string
  imageDescription: string
  suggestedInvestigators: SuggestedInvestigator[]
  suggestedBaptismEvents: SuggestedBaptismEvent[]
  rawResponse: string
}

// ========================================
// Llamada al LLM (Pollinations, formato OpenAI)
// ========================================

interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callLLM(messages: LLMMessage[]): Promise<string> {
  console.log('[ai] Calling Pollinations LLM with', messages.length, 'messages')

  // Pollinations acepta el formato OpenAI estándar
  const body = {
    model: 'openai-fast',
    messages,
    temperature: 0.5,  // más determinístico para JSON
    seed: Math.floor(Math.random() * 1000000),
    referrer: REFERRER,
    // Pedir respuesta directa sin razonamiento extenso
    reasoning_effort: 'low',
    max_tokens: 8000,  // límite alto para permitir JSON completo
  }

  // Pollinations puede tardar 60-120s en responder con prompts largos
  const response = await fetch(POLLINATIONS_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // @ts-expect-error - Next.js soporta signal con AbortSignal.timeout
    signal: AbortSignal.timeout(180000),  // 3 minutos máximo
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Pollinations API error ${response.status}: ${errText.slice(0, 300)}`)
  }

  const data = await response.json()
  const message = data.choices?.[0]?.message
  let content = message?.content

  // GPT-OSS 20B (modelo de Pollinations) a veces pone todo el razonamiento en `reasoning`
  // y deja `content` vacío. En ese caso, intentamos extraer el JSON del razonamiento.
  if (!content || content.trim() === '') {
    const reasoning = message?.reasoning
    if (reasoning && reasoning.trim()) {
      console.log('[ai] content vacío, extrayendo de reasoning (length:', reasoning.length, ')')
      // Buscar el último JSON válido en el razonamiento
      // El modelo suele escribir el JSON al final del razonamiento
      const jsonMatch = reasoning.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
      } else {
        content = reasoning
      }
    }
  }

  if (!content || content.trim() === '') {
    console.error('[ai] Pollinations respuesta vacía. Data:', JSON.stringify(data).slice(0, 500))
    throw new Error('Pollinations devolvió contenido vacío. Intenta de nuevo.')
  }
  return content
}

// ========================================
// Generación de imagen con Pollinations
// ========================================

export async function generateImageUrl(prompt: string): Promise<string> {
  // Pollinations image API: la URL misma genera la imagen (lazy).
  // Solo necesitamos construir la URL — el browser la carga.
  const enhanced = `${prompt}, editorial illustration style, warm peaceful lighting, no text, no faces visible, soft warm colors, missionary work theme, community and hope, high quality`
  const encoded = encodeURIComponent(enhanced)
  const seed = Math.floor(Math.random() * 1000000)
  return `${POLLINATIONS_IMAGE_URL}/${encoded}?width=1344&height=768&nologo=true&seed=${seed}&referrer=${REFERRER}`
}

// ========================================
// Prompt del sistema (enriquecido con contexto SUD)
// ========================================

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente experto en la obra misional de La Iglesia de Jesucristo de los Santos de los Últimos Días. Tu rol es ayudar al **Líder Misional de Barrio** a organizar la información de las reuniones de coordinación misional semanal con los misioneros de tiempo completo.

**IMPORTANTE: Respondes SIEMPRE con un JSON válido y completo, sin texto adicional, sin razonamiento previo, sin explicaciones. Solo el JSON.**

## Contexto del barrio actual
Estás ayudando específicamente al **Barrio Panamericano**, que está dividido en tres áreas misionales:
- **Panamericano A**
- **Panamericano B**
- **Panamericano C**

Cada área tiene asignada una compañía de misioneros (elders o hermanas) y el Líder Misional de Barrio coordina a los tres simultáneamente.

## Estructura de la Iglesia que conoces perfectamente

### Brazo Misional (predicar)
- **Presidente de Misión y esposa**: dirigen 150-250 misioneros durante 3 años; él posee las llaves para autorizar bautismos
- **Ayudantes del Presidente (AP)**: misioneros jóvenes que asisten al presidente
- **Líderes de Zona (LZ)**: supervisan grandes regiones de la misión
- **Líderes de Distrito (LD)**: supervisan 2-4 compañerismos y hacen entrevistas previas al bautismo
- **Hermana Líder de Capacitación (HLC)**: vela por bienestar y capacitación de hermanas
- **Compañerismo**: unidad básica de 2 (a veces 3) misioneros; nunca se separan

### Brazo Eclesiástico (administrar miembros)
- **Estaca** (o Distrito): agrupa 5-12 congregaciones, presidida por Presidente de Estaca
- **Barrio** (o Rama): 300-500 miembros, dirigido por Obispo
  - Cuórum de Élderes (hombres adultos)
  - Sociedad de Socorro (mujeres adultas)
  - Hombres Jóvenes / Mujeres Jóvenes (11-18 años)
  - Primaria (niños)
  - Escuela Dominical

### Conexión clave
Los misioneros de tiempo completo reportan a su Presidente de Misión, **pero cuando bautizan a alguien, esa persona pasa a ser responsabilidad total del Obispo del Barrio**. El Líder Misional de Barrio es el "puente" entre ambos brazos.

## El Líder Misional de Barrio
Es un miembro local llamado por el Obispo. Sus responsabilidades:
- Dirige la coordinación misional semanal
- Organiza a miembros locales para que acompañen a los misioneros a enseñar (fellowshipping)
- Coordina la logística de servicios bautismales
- Fomenta el hermanamiento (miembros invitan a misioneros e investigadores a comer)

## Coordinación misional semanal (antiguas "correlaciones")
Reuniones breves y específicas. **No se centran en eventos, sino en personas**. Se analiza:
- Quién del barrio puede acompañar a los misioneros a dar una lección
- Cómo ayudar a conversos recientes a adaptarse
- Estrategias para encontrar nuevas personas
- Progreso de investigadores específicos
- Ministración a miembros inactivos

## Reglas críticas para clasificar tareas

### Tareas de LÍDERES (requieren autoridad del sacerdocio o llamamiento específico)
- **Obispo**: entrevistas bautismales, autorizaciones, llamamientos, ordenanzas
- **Presidente de Estaca**: entrevistas especiales, llamamientos de obispado
- **Líder Misional de Barrio**: coordinación misional, asignar fellowshippers, coordinar bautismos
- **Presidente de Quórum de Élderes**: dirigir quórum, organizar raíces
- **Presidente de Sociedad de Socorro**: coordinar ministración a mujeres
- **Líderes de Sacerdocio**: bendecir la Santa Cena, ordenanzas
- **Misioneros**: enseñar lecciones misionales, extender compromisos bautismales
- **Líderes de Distrito (LD)**: entrevistas previas al bautismo

### Tareas para CUALQUIER MIEMBRO (no requieren autoridad)
- **PROGRAMAS**: imprimir programas del servicio bautismal
- **DECORACION**: decorar baptisterio, arreglos florales
- **REFRIGERIOS**: preparar comida/postres para bautismos, noches de hogar
- **MUSICA**: tocar piano/órgano, dirigir himnos
- **TRANSPORTE**: llevar investigadores o miembros a la iglesia
- **SETUP**: armar sillas, preparar salón, limpiar
- **FELLOWSHIPPING**: acompañar a los misioneros a enseñar (cualquier miembro puede)
- **MINISTRACION**: visitar miembros (especialmente inactivos o conversos recientes)
- **OTRO**: cualquier otra tarea logística

## Vocabulario SUD que usas correctamente
- barrio, estaca, obispado, presidencia de estaca
- élder, hermana, presidente de misión, AP, LZ, LD, HLC
- investigador, converso reciente, miembro inactivo, fellowshipping, hermanamiento
- ministración, lecciones misionales, Santa Cena, bautismo, confirmación
- noche de hogar, día de preparación (P-Day), Predicad Mi Evangelio
- "raíz" o "rait" = reuniones de activación de inactivos (jerga misional)
- Libro de Área (registro misional, ahora en la app Predicad Mi Evangelio)

## Tu tono
- Hablas español neutro mexicano
- Eres respetuoso del contexto espiritual
- Sugieres acciones prácticas y específicas
- Preservas nombres y fechas mencionadas en las notas`

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
// Construir contexto de la reunión (notas grandes por área)
// ========================================

function buildMeetingContext(
  meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] },
  areas: Area[] = []
): string {
  const date = new Date(meeting.meetingDate).toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  const parts: string[] = [
    `## Reunión de coordinación — ${date}`,
    `**Líder que preside:** ${meeting.leader}`,
  ]
  if (meeting.attendees) parts.push(`**Asistentes:** ${meeting.attendees}`)
  if (meeting.vision) parts.push(`\n### Visión / enfoque de la semana\n${meeting.vision}`)
  if (meeting.priorities) parts.push(`\n### Prioridades\n${meeting.priorities}`)

  // EL CAMPO CLAVE: rawNotes (la nota grande dividida por secciones)
  if (meeting.notes) {
    parts.push(`\n### NOTAS DE LA REUNIÓN (divididas por área)\n${meeting.notes}`)
  }

  if (meeting.commitments) parts.push(`\n### Compromisos generales\n${meeting.commitments}`)

  // Lista de áreas disponibles para que la IA sepa cuáles existen
  if (areas.length > 0) {
    parts.push(`\n### Áreas misionales del barrio`)
    areas.forEach((a) => parts.push(`- ${a.name}`))
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

Analiza las notas de esta reunión de coordinación misional del Barrio Panamericano y genera un JSON con la siguiente estructura EXACTA. NO agregues texto fuera del JSON.

**IMPORTANTE: Las notas del líder misional suelen ser breves y abreviadas.** Por ejemplo:
- "familia ornelas madre y 4 hijos se bautisan el 28 de junio" → bautismo familiar programado
- "necesitamos ropa, hermana pereda, Karina o sandy y pdte de hombres jovenes" → se necesita ropa bautismal y fellowshippers
- "raíz" o "rait" → reunión de activación de inactivos
- "MAS MINISTRACION" → se necesita más ministración (visitas) a esa persona
- "cita mañana a las 7:30pm" → cita específica programada
- "La Quemada" → probablemente una colonia o lugar específico del área
- "tentativa para 4 de julio" → fecha tentativa de bautismo

Interpreta estas abreviaturas correctamente en el contexto misional SUD.

\`\`\`json
{
  "summary": "Resumen estructurado en markdown de máximo 500 palabras. Incluye: propósito de la reunión, decisiones principales por área, temas prioritarios y próximos pasos. Usa encabezados ## y listas con - cuando sea apropiado. Menciona a las personas por nombre cuando sea relevante.",
  "leadershipTasks": [
    {
      "task": "Descripción clara de la tarea que SOLO puede hacer un líder del sacerdocio o con llamamiento específico (obispo, líder misional, LD, presidente de quórum, etc.).",
      "who": "Rol específico (no nombre). Ej: 'Obispo', 'Líder de Distrito (LD)', 'Líder Misional de Barrio'",
      "dueDate": "Fecha en YYYY-MM-DD o null",
      "rationale": "Por qué debe hacerlo un líder"
    }
  ],
  "generalTasks": [
    {
      "task": "Descripción de la tarea que cualquier miembro puede hacer",
      "who": "Voluntario sugerido (usa nombres mencionados si los hay)",
      "category": "PROGRAMAS | DECORACION | REFRIGERIOS | MUSICA | TRANSPORTE | SETUP | FELLOWSHIPPING | MINISTRACION | OTRO",
      "description": "Detalles de cómo hacerlo"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "question": "Pregunta sobre algo ambiguo en las notas",
      "context": "Por qué es relevante",
      "options": ["Opción A", "Opción B", "Opción C"]
    }
  ],
  "imagePrompt": "Prompt en inglés para generar una imagen que represente esta reunión. Estilo ilustración editorial cálida, sin texto, sin rostros visibles, tema obra misional SUD.",
  "imageDescription": "Descripción en español de qué representará la imagen"
}
\`\`\`

## Reglas importantes

1. **leadershipTasks**: Solo tareas que requieren autoridad del sacerdocio o llamamiento específico.
2. **generalTasks**: Cualquier miembro puede hacerlas. fellowshipping, ropa bautismal, ministración, decoración, refrigerios, transporte, música, setup — TODAS son de cualquier miembro.
3. **questions**: Solo si HAY ambigüedad real. Si todo está claro, devuelve array vacío.
4. **Fechas**: Si las notas mencionan "el 28 de junio", usa 2026-06-28. Si dicen "este Jueves", calcula la fecha del próximo jueves desde hoy (2026-06-24, miércoles → próximo jueves es 2026-06-25).
5. **Nombres**: Preserva nombres mencionados en las notas.
6. Devuelve SOLO el JSON, sin markdown code fences, sin texto explicativo antes o después.`
}

// ========================================
// Parseo de respuesta
// ========================================

function parseAIResponse(content: string): AIAnalysisResult {
  let cleaned = content.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }

  // Intentar parseo directo
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Intentar extraer el JSON de un texto más grande
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        // Intentar reparar JSON truncado cerrando estructuras abiertas
        try {
          let truncated = cleaned.slice(start)
          let openBraces = 0, openBrackets = 0
          let inString = false, escape = false
          for (const ch of truncated) {
            if (escape) { escape = false; continue }
            if (ch === '\\') { escape = true; continue }
            if (ch === '"') { inString = !inString; continue }
            if (inString) continue
            if (ch === '{') openBraces++
            else if (ch === '}') openBraces--
            else if (ch === '[') openBrackets++
            else if (ch === ']') openBrackets--
          }
          truncated = truncated.replace(/,\s*$/, '')
          if (inString) truncated += '"'
          for (let i = 0; i < openBrackets; i++) truncated += ']'
          for (let i = 0; i < openBraces; i++) truncated += '}'
          parsed = JSON.parse(truncated)
          console.log('[ai] JSON reparado tras truncamiento')
        } catch {
          // Última estrategia: extraer campos individualmente con regex
          parsed = extractFieldsIndividually(cleaned)
          if (parsed) {
            console.log('[ai] JSON extraído campo por campo (fallback)')
          } else {
            console.error('[ai] No se pudo parsear JSON. Contenido (primeros 1500 chars):', cleaned.slice(0, 1500))
            throw new Error('No se pudo parsear la respuesta de la IA como JSON. Intenta de nuevo.')
          }
        }
      }
    } else {
      parsed = extractFieldsIndividually(cleaned)
      if (!parsed) {
        throw new Error('No se pudo parsear la respuesta de la IA como JSON')
      }
    }
  }

  return {
    summary: String(parsed.summary || '').trim(),
    leadershipTasks: Array.isArray(parsed.leadershipTasks) ? parsed.leadershipTasks as LeadershipTask[] : [],
    generalTasks: Array.isArray(parsed.generalTasks) ? parsed.generalTasks as GeneralTask[] : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions as AIQuestion[] : [],
    imagePrompt: String(parsed.imagePrompt || '').trim(),
    imageDescription: String(parsed.imageDescription || '').trim(),
    suggestedInvestigators: Array.isArray(parsed.suggestedInvestigators) ? parsed.suggestedInvestigators as SuggestedInvestigator[] : [],
    suggestedBaptismEvents: Array.isArray(parsed.suggestedBaptismEvents) ? parsed.suggestedBaptismEvents as SuggestedBaptismEvent[] : [],
    rawResponse: content,
  }
}

// Extracción tolerante de campos cuando el JSON está corrupto
function extractFieldsIndividually(text: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {}

  // Helper: extraer un string value de una key
  const extractString = (key: string): string => {
    // Buscar "key": "value" o "key": value
    const regex = new RegExp(`"${key}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|[\\w\\s]+)`, 'm')
    const match = text.match(regex)
    if (match) {
      let v = match[1]
      if (v.startsWith('"')) v = v.slice(1, -1)
      return v
    }
    return ''
  }

  // Helper: extraer array de objetos
  const extractArray = (key: string): unknown[] => {
    const regex = new RegExp(`"${key}"\\s*:\\s*\\[`, 'm')
    const match = text.match(regex)
    if (!match) return []
    const start = match.index! + match[0].length
    // Encontrar el final del array (balanceo de corchetes)
    let depth = 1, i = start, inString = false, escape = false
    while (i < text.length && depth > 0) {
      const ch = text[i]
      if (escape) { escape = false; i++; continue }
      if (ch === '\\') { escape = true; i++; continue }
      if (ch === '"') { inString = !inString; i++; continue }
      if (inString) { i++; continue }
      if (ch === '[') depth++
      else if (ch === ']') depth--
      i++
    }
    const arrayStr = text.slice(start, i - 1)
    // Intentar parsear el array como JSON
    try {
      return JSON.parse('[' + arrayStr + ']')
    } catch {
      // Si falla, intentar parsear objetos individuales
      const objects: unknown[] = []
      const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
      let m
      while ((m = objRegex.exec(arrayStr)) !== null) {
        try {
          objects.push(JSON.parse(m[0]))
        } catch {
          // Intentar reparar
          try {
            const fixed = m[0] + (m[0].split('{').length - 1 > m[0].split('}').length - 1 ? '}' : '')
            objects.push(JSON.parse(fixed))
          } catch {
            // Ignorar objetos corruptos
          }
        }
      }
      return objects
    }
  }

  result.summary = extractString('summary')
  result.imagePrompt = extractString('imagePrompt')
  result.imageDescription = extractString('imageDescription')
  result.leadershipTasks = extractArray('leadershipTasks')
  result.generalTasks = extractArray('generalTasks')
  result.questions = extractArray('questions')
  result.suggestedInvestigators = extractArray('suggestedInvestigators')
  result.suggestedBaptismEvents = extractArray('suggestedBaptismEvents')

  // Si al menos summary o alguna lista tienen contenido, devolver
  if (result.summary || (result.leadershipTasks as unknown[])?.length || (result.suggestedInvestigators as unknown[])?.length) {
    return result
  }
  return null
}

// ========================================
// Función principal: analizar reunión
// ========================================

// Dividimos en 2 llamadas para evitar truncamiento por límite de tokens:
//   Llamada 1: resumen, tareas, preguntas, imagen (output más conceptual)
//   Llamada 2: investigadores y bautismos sugeridos (output más estructurado)
// Ambas usan el mismo contexto pero prompts diferentes.

export async function analyzeMeeting(
  meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] },
  areas: Area[] = []
): Promise<AIAnalysisResult> {
  const systemPrompt = await getSystemPrompt()
  const meetingContext = buildMeetingContext(meeting, areas)

  // === Llamada 1: análisis principal ===
  const analysisPrompt = buildAnalysisPrompt(meetingContext)
  console.log('[ai] Llamada 1: análisis principal (resumen, tareas, imagen)')
  const content1 = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: analysisPrompt },
  ])
  const result1 = parseAIResponse(content1)

  // === Llamada 2: sugerencias estructuradas para el sistema ===
  console.log('[ai] Llamada 2: sugerencias de investigadores y bautismos')
  const suggestionsPrompt = buildSuggestionsPrompt(meetingContext)
  const content2 = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: suggestionsPrompt },
  ])
  const result2 = parseAIResponse(content2)

  // Combinar resultados
  return {
    ...result1,
    suggestedInvestigators: result2.suggestedInvestigators,
    suggestedBaptismEvents: result2.suggestedBaptismEvents,
    rawResponse: JSON.stringify({ analysis: content1, suggestions: content2 }),
  }
}

// ========================================
// Prompt para sugerencias estructuradas (investigadores + bautismos)
// ========================================

function buildSuggestionsPrompt(meetingContext: string): string {
  return `${meetingContext}

---

## Tu tarea

Identifica TODAS las personas mencionadas en las notas que están siendo enseñadas por los misioneros o que tienen bautismo programado/realizado. Genera un JSON con la siguiente estructura EXACTA. NO agregues texto fuera del JSON.

\`\`\`json
{
  "suggestedInvestigators": [
    {
      "firstName": "Nombre (solo el primer nombre, ej: 'María', 'Juan', 'Valeria')",
      "lastName": "Apellido (si se menciona, ej: 'Ornelas', 'González', 'Valenzuela'. Si no se menciona, usa '')",
      "areaName": "Panamericano A | Panamericano B | Panamericano C (debe coincidir con el área bajo la cual aparece la nota)",
      "status": "NUEVO | EN_PROGRESO | FECHA_BAUTISMO | BAUTIZADO | INACTIVO",
      "baptismGoalDate": "YYYY-MM-DD si hay fecha de bautismo (confirmada o tentativa), o null",
      "baptismDate": "YYYY-MM-DD solo si ya está bautizado, o null",
      "phone": "teléfono si se menciona, o null",
      "address": "dirección/lugar si se menciona (ej: 'laderas', 'La Quemada'), o null",
      "source": "fuente si se infiere (ej: 'Referencia de miembro'), o null",
      "referredBy": "nombre del miembro que refirió si se menciona, o null",
      "notes": "contexto breve sobre esta persona",
      "rationale": "por qué sugieres crear este investigador"
    }
  ],
  "suggestedBaptismEvents": [
    {
      "investigatorName": "Nombre completo del investigador (ej: 'María Ornelas')",
      "areaName": "Panamericano A | B | C",
      "date": "YYYY-MM-DD",
      "isTentative": true si dice "tentativa"/"tentativo", false si está confirmado,
      "notes": "notas adicionales"
    }
  ]
}
\`\`\`

## Reglas

1. **Crea una entrada por CADA persona mencionada** en las notas que está siendo enseñada, bautizada, o que es miembro inactivo a visitar.
2. Si la nota dice "familia Ornelas madre y 4 hijos", crea entradas separadas para cada miembro si se pueden identificar (madre, hija 15, hijo 14, gemelos 12). Si no se pueden identificar los nombres, crea una entrada con firstName="Familia" lastName="Ornelas".
3. Para bautismos: si la nota dice "se bautisan el 28 de junio" → fecha exacta 2026-06-28, isTentative=false. Si dice "tentativa para 4 de julio" → fecha 2026-07-04, isTentative=true.
4. El areaName debe ser el área bajo la cual aparece la nota (entre los marcadores === Panamericano X ===).
5. Si la nota menciona "raíz" o "rait", es una reunión de activación, no un bautismo.
6. Devuelve SOLO el JSON, sin texto adicional.`
}

// ========================================
// Refinar análisis con respuestas del usuario
// ========================================

export async function refineAnalysis(
  meeting: CorrelationMeeting & { agendaItems?: AgendaItem[] },
  previousAnalysis: AIAnalysisResult,
  answers: Record<string, string>,
  areas: Area[] = []
): Promise<AIAnalysisResult> {
  const systemPrompt = await getSystemPrompt()
  const meetingContext = buildMeetingContext(meeting, areas)

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

Con esta nueva información, genera una versión REFINADA del análisis. Mantén la misma estructura JSON. Las preguntas respondidas se eliminan (o se agregan nuevas si surgieron). Ajusta las tareas, sugerencias de investigadores y bautismos según las respuestas.

Devuelve SOLO el JSON, sin texto adicional.`

  const content = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  return parseAIResponse(content)
}

// ========================================
// Test de conexión
// ========================================

export async function testAIConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const content = await callLLM([
      { role: 'system', content: 'Eres un asistente útil. Responde en español.' },
      { role: 'user', content: 'Responde solo con la palabra: CONECTADO' },
    ])
    return {
      ok: true,
      message: `IA conectada correctamente (Pollinations, gratis). Respuesta de prueba: "${content.slice(0, 50)}"`,
    }
  } catch (e) {
    return { ok: false, message: `Error: ${(e as Error).message}` }
  }
}
