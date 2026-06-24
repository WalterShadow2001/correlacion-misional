import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.correlationMeeting.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const meeting = await db.correlationMeeting.update({
      where: { id },
      data: {
        leader: body.leader,
        attendees: body.attendees || null,
        vision: body.vision || null,
        priorities: body.priorities || null,
        notes: body.notes || null,
        commitments: body.commitments || null,
      },
    })
    return NextResponse.json(meeting)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
