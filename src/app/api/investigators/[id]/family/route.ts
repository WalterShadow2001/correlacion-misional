import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: listar familiares de un investigador
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const family = await db.familyMember.findMany({
      where: { investigatorId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(family)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST: agregar un familiar
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const fm = await db.familyMember.create({
      data: {
        investigatorId: id,
        name: body.name,
        age: body.age || null,
        isMember: !!body.isMember,
        isInvestigator: !!body.isInvestigator,
        relationship: body.relationship || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(fm)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
