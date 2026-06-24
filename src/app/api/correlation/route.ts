import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const areaId = searchParams.get('areaId')
    const meetings = await db.correlationMeeting.findMany({
      where: areaId ? { areaId } : undefined,
      include: {
        agendaItems: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { meetingDate: 'desc' },
    })
    return NextResponse.json(meetings)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const meeting = await db.correlationMeeting.create({
      data: {
        areaId: body.areaId || null,
        meetingDate: new Date(body.meetingDate),
        leader: body.leader,
        attendees: body.attendees || null,
        vision: body.vision || null,
        priorities: body.priorities || null,
        notes: body.notes || null,
        commitments: body.commitments || null,
        agendaItems: body.agendaItems
          ? {
              create: body.agendaItems.map((item: { topic: string; discussion?: string; action?: string; responsible?: string; investigatorId?: string }) => ({
                topic: item.topic,
                discussion: item.discussion || null,
                action: item.action || null,
                responsible: item.responsible || null,
                investigatorId: item.investigatorId || null,
              })),
            }
          : undefined,
      },
      include: { agendaItems: true },
    })
    return NextResponse.json(meeting)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
