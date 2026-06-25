import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ai'

// GET: listar todas las lecciones aprendidas (permanentes + del usuario)
export async function GET() {
  try {
    // Obtener correcciones del usuario de la DB
    let userCorrections: Array<{ id: string; category: string; feedback: string; createdAt: Date }> = []
    try {
      userCorrections = await db.aICorrection.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    } catch {}

    // Agrupar por categoría y contar frecuencia
    const byCategory: Record<string, Array<{ feedback: string; count: number; lastUsed: Date }>> = {}

    for (const c of userCorrections) {
      if (!byCategory[c.category]) byCategory[c.category] = []
      const existing = byCategory[c.category].find((x) => x.feedback === c.feedback)
      if (existing) {
        existing.count++
        if (c.createdAt > existing.lastUsed) existing.lastUsed = c.createdAt
      } else {
        byCategory[c.category].push({ feedback: c.feedback, count: 1, lastUsed: c.createdAt })
      }
    }

    return NextResponse.json({
      ok: true,
      userCorrections: {
        total: userCorrections.length,
        unique: Object.values(byCategory).reduce((acc, arr) => acc + arr.length, 0),
        byCategory: Object.entries(byCategory).map(([category, lessons]) => ({
          category,
          count: lessons.length,
          lessons: lessons.sort((a, b) => b.count - a.count),  // más frecuentes primero
        })),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// DELETE: eliminar una lección por feedback (para que el usuario gestione)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const feedback = searchParams.get('feedback')
    if (!feedback) {
      return NextResponse.json({ error: 'feedback requerido' }, { status: 400 })
    }

    const result = await db.aICorrection.deleteMany({
      where: { feedback: feedback },
    })

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      message: `${result.count} lección(es) eliminada(s)`,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
