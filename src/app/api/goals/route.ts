import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const goals = await db.goal.findMany({
      include: { area: true },
      orderBy: [{ period: 'desc' }, { goalType: 'asc' }],
    })
    return NextResponse.json(goals)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const goal = await db.goal.create({
      data: {
        areaId: body.areaId,
        period: body.period,
        goalType: body.goalType,
        target: body.target,
        actual: body.actual || 0,
      },
    })
    return NextResponse.json(goal)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
