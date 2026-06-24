import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Actualizar progreso de una lección específica
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    // id aquí es el investigatorId
    const updated = await db.teachingProgress.updateMany({
      where: { investigatorId: id, lessonNumber: body.lessonNumber },
      data: {
        completed: body.completed,
        completedDate: body.completed ? new Date() : null,
        notes: body.notes || null,
      },
    })
    // actualizar contador de lecciones en el investigador
    const completedCount = await db.teachingProgress.count({
      where: { investigatorId: id, completed: true },
    })
    await db.investigator.update({
      where: { id },
      data: { lessonsReceived: completedCount },
    })
    return NextResponse.json({ updated, lessonsReceived: completedCount })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
