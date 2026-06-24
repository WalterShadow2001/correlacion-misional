import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const LESSON_TITLES = [
  'La Restauración del Evangelio',
  'El Plan de Salvación',
  'El Evangelio de Jesucristo',
  'El Mandamiento de los Diezmos',
  'La Ley de Castidad y la Familia',
]

async function ensureLessons(investigatorId: string) {
  const existing = await db.teachingProgress.findMany({ where: { investigatorId } })
  const missing = LESSON_TITLES.map((title, i) => ({ number: i + 1, title })).filter(
    (l) => !existing.some((e) => e.lessonNumber === l.number)
  )
  if (missing.length === 0) return
  await db.teachingProgress.createMany({
    data: missing.map((l) => ({
      investigatorId,
      lessonNumber: l.number,
      lessonTitle: l.title,
    })),
  })
}

export async function GET() {
  try {
    const investigators = await db.investigator.findMany({
      include: {
        area: true,
        progress: { orderBy: { lessonNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(investigators)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const inv = await db.investigator.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        fullName: `${body.firstName} ${body.lastName}`,
        phone: body.phone || null,
        address: body.address || null,
        areaId: body.areaId,
        status: body.status || 'NUEVO',
        source: body.source || null,
        referredBy: body.referredBy || null,
        baptismGoalDate: body.baptismGoalDate ? new Date(body.baptismGoalDate) : null,
        notes: body.notes || null,
      },
    })
    await ensureLessons(inv.id)
    return NextResponse.json(inv)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
