import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Crear compañía + misioneros en una transacción
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { areaId, missionaries } = body as {
      areaId: string
      missionaries: Array<{
        firstName: string
        lastName: string
        type: 'ELDER' | 'HERMANA' | 'PAREJA'
        role: 'LIDER' | 'SENIOR' | 'JUNIOR'
        phone?: string
        email?: string
      }>
    }

    // Marcar anteriores como inactivas
    await db.companionship.updateMany({
      where: { areaId, active: true },
      data: { active: false, endDate: new Date() },
    })

    const comp = await db.companionship.create({
      data: {
        areaId,
        active: true,
        missionaires: {
          create: missionaries.map((m) => ({
            firstName: m.firstName,
            lastName: m.lastName,
            fullName: `${m.firstName} ${m.lastName}`,
            type: m.type,
            role: m.role,
            phone: m.phone || null,
            email: m.email || null,
          })),
        },
      },
      include: { missionaires: true },
    })
    return NextResponse.json(comp)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const comps = await db.companionship.findMany({
      include: { missionaires: true, area: true },
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json(comps)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
