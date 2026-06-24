import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeMeeting, generateImageUrl } from '@/lib/ai'

// POST: analizar reunión con IA
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const meeting = await db.correlationMeeting.findUnique({
      where: { id },
      include: { agendaItems: { orderBy: { createdAt: 'asc' } } },
    })
    if (!meeting) {
      return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })
    }

    // Obtener todas las áreas del barrio para que la IA las conozca
    const areas = await db.area.findMany({ orderBy: { name: 'asc' } })

    // Crear o actualizar registro de análisis
    const analysis = await db.aIAnalysis.upsert({
      where: { meetingId: id },
      create: { meetingId: id, status: 'PROCESANDO' },
      update: { status: 'PROCESANDO', error: null },
    })

    try {
      const result = await analyzeMeeting(meeting, areas)

      // Generar URL de imagen con Pollinations (no descarga el binario, solo construye URL lazy)
      let imageUrl: string | null = null
      if (result.imagePrompt) {
        try {
          imageUrl = await generateImageUrl(result.imagePrompt)
        } catch (imgErr) {
          console.error('Error generando URL de imagen:', imgErr)
        }
      }

      const updated = await db.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'COMPLETADO',
          summary: result.summary,
          leadershipTasks: JSON.stringify(result.leadershipTasks),
          generalTasks: JSON.stringify(result.generalTasks),
          questions: JSON.stringify(result.questions),
          imagePrompt: result.imagePrompt,
          imageDescription: result.imageDescription,
          // Guardamos la URL de la imagen (Pollinations lazy) en vez del base64
          imageDataUrl: imageUrl,
          rawResponse: result.rawResponse,
        },
      })

      // Guardamos sugerencias en el rawResponse para que el endpoint /apply las pueda leer
      // (no tenemos campos separados en DB para esto, así que las incluimos en un JSON auxiliar)
      const suggestedData = {
        suggestedInvestigators: result.suggestedInvestigators,
        suggestedBaptismEvents: result.suggestedBaptismEvents,
      }
      await db.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          // Reutilizamos el campo error como JSON de sugerencias (lo limpiamos)
          error: null,
          // Usamos imageDescription para guardar también las sugerencias serializadas
          // Mejor: extendemos el rawResponse para incluir sugerencias
          rawResponse: JSON.stringify({
            raw: result.rawResponse,
            suggested: suggestedData,
          }),
        },
      })

      return NextResponse.json({
        ok: true,
        analysis: {
          id: updated.id,
          status: updated.status,
          summary: updated.summary,
          leadershipTasks: result.leadershipTasks,
          generalTasks: result.generalTasks,
          questions: result.questions,
          imagePrompt: updated.imagePrompt,
          imageDescription: updated.imageDescription,
          imageUrl: imageUrl,
          suggestedInvestigators: result.suggestedInvestigators,
          suggestedBaptismEvents: result.suggestedBaptismEvents,
        },
      })
    } catch (e) {
      await db.aIAnalysis.update({
        where: { id: analysis.id },
        data: { status: 'ERROR', error: (e as Error).message },
      })
      throw e
    }
  } catch (e) {
    console.error('analyze error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// GET: obtener análisis existente
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const analysis = await db.aIAnalysis.findUnique({ where: { meetingId: id } })
    if (!analysis) {
      return NextResponse.json({ ok: true, analysis: null })
    }

    // Parsear sugerencias del rawResponse si están disponibles
    let suggestedInvestigators: unknown[] = []
    let suggestedBaptismEvents: unknown[] = []
    if (analysis.rawResponse) {
      try {
        const parsed = JSON.parse(analysis.rawResponse)
        if (parsed.suggested) {
          suggestedInvestigators = parsed.suggested.suggestedInvestigators || []
          suggestedBaptismEvents = parsed.suggested.suggestedBaptismEvents || []
        }
      } catch {
        // rawResponse no es JSON, no hay sugerencias
      }
    }

    return NextResponse.json({
      ok: true,
      analysis: {
        id: analysis.id,
        status: analysis.status,
        summary: analysis.summary,
        leadershipTasks: analysis.leadershipTasks ? JSON.parse(analysis.leadershipTasks) : [],
        generalTasks: analysis.generalTasks ? JSON.parse(analysis.generalTasks) : [],
        questions: analysis.questions ? JSON.parse(analysis.questions) : [],
        imagePrompt: analysis.imagePrompt,
        imageDescription: analysis.imageDescription,
        imageUrl: analysis.imageDataUrl,  // ahora es URL, no data URL
        error: analysis.error,
        suggestedInvestigators,
        suggestedBaptismEvents,
        updatedAt: analysis.updatedAt,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
