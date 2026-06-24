import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeMeeting, generateMeetingImage } from '@/lib/ai'

// POST: analizar reunión con IA
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const meeting = await db.correlationMeeting.findUnique({
      where: { id },
      include: { area: true, agendaItems: { orderBy: { createdAt: 'asc' } } },
    })
    if (!meeting) {
      return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })
    }

    // Crear o actualizar registro de análisis (estado: PROCESANDO)
    const analysis = await db.aIAnalysis.upsert({
      where: { meetingId: id },
      create: { meetingId: id, status: 'PROCESANDO' },
      update: { status: 'PROCESANDO', error: null },
    })

    try {
      // 1) Llamar al LLM
      const result = await analyzeMeeting(meeting)

      // 2) Generar la imagen (si hay prompt)
      let imageDataUrl: string | null = null
      if (result.imagePrompt) {
        try {
          imageDataUrl = await generateMeetingImage(result.imagePrompt)
        } catch (imgErr) {
          console.error('Error generando imagen:', imgErr)
          // No fallar todo el análisis si solo la imagen falla
        }
      }

      // 3) Guardar resultados
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
          imageDataUrl,
          rawResponse: result.rawResponse,
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
          imageDataUrl: updated.imageDataUrl,
        },
      })
    } catch (e) {
      // Guardar el error
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
    const analysis = await db.aIAnalysis.findUnique({
      where: { meetingId: id },
    })
    if (!analysis) {
      return NextResponse.json({ ok: true, analysis: null })
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
        imageDataUrl: analysis.imageDataUrl,
        error: analysis.error,
        updatedAt: analysis.updatedAt,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
