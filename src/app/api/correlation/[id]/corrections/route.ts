import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface CorrectionRequest {
  corrections?: Array<{
    category: string  // 'investigators' | 'tasks' | 'summary' | 'general'
    feedback: string
  }>
  userCorrections?: string  // JSON con la versión corregida por el usuario
  correctionNotes?: string  // notas del usuario
}

// POST: guardar correcciones del usuario para que la IA aprenda
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as CorrectionRequest

    // Verificar que existe el análisis
    const analysis = await db.aIAnalysis.findUnique({ where: { meetingId: id } })
    if (!analysis) {
      return NextResponse.json({ error: 'No hay análisis previo.' }, { status: 400 })
    }

    // Guardar correcciones individuales (para que la IA aprenda en futuros análisis)
    let correctionsCreated = 0
    if (body.corrections && body.corrections.length > 0) {
      for (const c of body.corrections) {
        if (c.feedback && c.feedback.trim()) {
          await db.aICorrection.create({
            data: {
              analysisId: analysis.id,
              category: c.category,
              feedback: c.feedback.trim(),
            },
          })
          correctionsCreated++
        }
      }
    }

    // Guardar la versión corregida completa (para mostrar en el modal)
    await db.aIAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'CORREGIDO',
        userCorrections: body.userCorrections || null,
        correctionNotes: body.correctionNotes || null,
      },
    })

    return NextResponse.json({
      ok: true,
      correctionsCreated,
      message: correctionsCreated > 0
        ? `${correctionsCreated} correcciones guardadas. La IA las aplicará en futuros análisis.`
        : 'Versión corregida guardada.',
    })
  } catch (e) {
    console.error('corrections error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// GET: obtener correcciones guardadas
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const analysis = await db.aIAnalysis.findUnique({
      where: { meetingId: id },
      include: { corrections: { orderBy: { createdAt: 'desc' } } },
    })
    if (!analysis) {
      return NextResponse.json({ error: 'No hay análisis previo.' }, { status: 404 })
    }
    return NextResponse.json({
      ok: true,
      userCorrections: analysis.userCorrections ? JSON.parse(analysis.userCorrections) : null,
      correctionNotes: analysis.correctionNotes,
      corrections: analysis.corrections.map((c) => ({
        id: c.id,
        category: c.category,
        feedback: c.feedback,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
