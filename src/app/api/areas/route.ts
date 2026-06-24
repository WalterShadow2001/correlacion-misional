import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const areas = await db.area.findMany({
      include: {
        zone: true,
        companionships: {
          include: { missionaires: true },
          orderBy: { startDate: 'desc' },
        },
        _count: { select: { investigators: true, goals: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(areas)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const area = await db.area.create({
      data: { name: body.name, zoneId: body.zoneId },
      include: { zone: true },
    })
    return NextResponse.json(area)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
