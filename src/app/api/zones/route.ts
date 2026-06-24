import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const zones = await db.zone.findMany({
      include: { areas: { include: { _count: { select: { investigators: true, companionships: true } } } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(zones)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const zone = await db.zone.create({
      data: { name: body.name, description: body.description || null },
    })
    return NextResponse.json(zone)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
