import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const list = await db.fellowshipper.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const f = await db.fellowshipper.create({
      data: {
        name: body.name,
        phone: body.phone || null,
        areaId: body.areaId || null,
        assignedTo: body.assignedTo || null,
      },
    })
    return NextResponse.json(f)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
