import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { refineAnalysis, generateImageUrl } from '@/lib/ai'

// POST: refinar análisis con respuestas del usuario
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { answers } = await req.json() as { answers: Record<string, string> }

    const meeting = await db.correlationMeeting.findUnique({
      where: { id },
      include: { agendaItems: { orderBy: { createdAt: 'asc' } } },
    })
    if (!meeting) {
      return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })
    }

    const existing = await db.aIAnalysis.findUnique({ where: { meetingId: id } })
    if (!existing) {
      return NextResponse.json({ error: 'No hay análisis previo. Ejecuta /analyze primero.' }, { status: 400 })
    }

    const areas = await db.area.findMany({ orderBy: { name: 'asc' } })

    // Reconstruir el análisis previo
    const previousAnalysis = {
      summary: existing.summary || '',
      leadershipTasks: existing.leadershipTasks ? JSON.parse(existing.leadershipTasks) : [],
      generalTasks: existing.generalTasks ? JSON.parse(existing.generalTasks) : [],
      questions: existing.questions ? JSON.parse(existing.questions) : [],
      imagePrompt: existing.imagePrompt || '',
      imageDescription: existing.imageDescription || '',
      rawResponse: existing.rawResponse || '',
      suggestedInvestigators: [],
      suggestedBaptismEvents: [],
    }

    await db.aIAnalysis.update({
      where: { meetingId: id },
      data: { status: 'PROCESANDO', error: null },
    })

    try {
      const result = await refineAnalysis(meeting, previousAnalysis, answers, areas)

      let imageUrl = existing.imageDataUrl
      if (result.imagePrompt && result.imagePrompt !== previousAnalysis.imagePrompt) {
        try {
          imageUrl = await generateImageUrl(result.imagePrompt)
        } catch (imgErr) {
          console.error('Error regenerando URL de imagen:', imgErr)
        }
      }

      const updated = await db.aIAnalysis.update({
        where: { meetingId: id },
        data: {
          status: 'REFINADO',
          summary: result.summary,
          leadershipTasks: JSON.stringify(result.leadershipTasks),
          generalTasks: JSON.stringify(result.generalTasks),
          questions: JSON.stringify(result.questions),
          imagePrompt: result.imagePrompt,
          imageDescription: result.imageDescription,
          imageDataUrl: imageUrl,
          rawResponse: JSON.stringify({
            raw: result.rawResponse,
            suggested: {
              suggestedInvestigators: result.suggestedInvestigators,
              suggestedBaptismEvents: result.suggestedBaptismEvents,
            },
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
          imageUrl,
          suggestedInvestigators: result.suggestedInvestigators,
          suggestedBaptismEvents: result.suggestedBaptismEvents,
        },
      })
    } catch (e) {
      await db.aIAnalysis.update({
        where: { meetingId: id },
        data: { status: 'ERROR', error: (e as Error).message },
      })
      throw e
    }
  } catch (e) {
    console.error('refine error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
