import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const inv = await db.investigator.findUnique({
      where: { id },
      include: { area: true, progress: { orderBy: { lessonNumber: 'asc' } } },
    })
    return NextResponse.json(inv)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    for (const key of ['firstName', 'lastName', 'phone', 'address', 'status', 'source', 'referredBy', 'notes', 'lessonsReceived', 'churchAttendance']) {
      if (body[key] !== undefined) data[key] = body[key]
    }
    if (body.firstName || body.lastName) {
      const current = await db.investigator.findUnique({ where: { id } })
      data.fullName = `${body.firstName ?? current?.firstName ?? ''} ${body.lastName ?? current?.lastName ?? ''}`.trim()
    }
    if (body.baptismDate !== undefined) data.baptismDate = body.baptismDate ? new Date(body.baptismDate) : null
    if (body.baptismGoalDate !== undefined) data.baptismGoalDate = body.baptismGoalDate ? new Date(body.baptismGoalDate) : null
    if (body.lastVisitDate !== undefined) data.lastVisitDate = body.lastVisitDate ? new Date(body.lastVisitDate) : null
    if (body.areaId) data.areaId = body.areaId

    const inv = await db.investigator.update({ where: { id }, data })
    return NextResponse.json(inv)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.investigator.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
