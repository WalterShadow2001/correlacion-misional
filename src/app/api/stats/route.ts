import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Estadísticas para el dashboard del líder misional
export async function GET() {
  try {
    const [zones, areas, investigators, baptized, meetings, goals] = await Promise.all([
      db.zone.count(),
      db.area.count(),
      db.investigator.groupBy({ by: ['status'], _count: true }),
      db.investigator.count({ where: { status: 'BAUTIZADO' } }),
      db.correlationMeeting.count(),
      db.goal.findMany({ include: { area: true } }),
    ])

    // Bautismos del mes actual
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const baptismsThisMonth = await db.investigator.count({
      where: { baptismDate: { gte: startOfMonth, lte: endOfMonth } },
    })

    // Próximos bautismos programados (fecha objetivo futura)
    const upcomingBaptisms = await db.investigator.findMany({
      where: {
        baptismGoalDate: { gte: now },
        status: { in: ['FECHA_BAUTISMO', 'EN_PROGRESO'] },
      },
      include: { area: true },
      orderBy: { baptismGoalDate: 'asc' },
      take: 10,
    })

    // Resumen por área
    const areasWithStats = await db.area.findMany({
      include: {
        zone: true,
        companionships: {
          where: { active: true },
          include: { missionaires: true },
          take: 1,
        },
        _count: {
          select: {
            investigators: true,
          },
        },
      },
    })

    const areaStats = await Promise.all(
      areasWithStats.map(async (a) => {
        const activeInvestigators = await db.investigator.count({
          where: {
            areaId: a.id,
            status: { in: ['NUEVO', 'EN_PROGRESO', 'FECHA_BAUTISMO'] },
          },
        })
        const baptizedInArea = await db.investigator.count({
          where: { areaId: a.id, status: 'BAUTIZADO' },
        })
        return {
          id: a.id,
          name: a.name,
          zone: a.zone.name,
          companions: a.companionships[0]?.missionaires.map((m) => m.fullName).join(' + ') || 'Sin asignar',
          activeInvestigators,
          baptizedInArea,
          totalInvestigators: a._count.investigators,
        }
      })
    )

    return NextResponse.json({
      totals: {
        zones,
        areas,
        baptized,
        baptismsThisMonth,
        meetings,
        investigatorsByStatus: investigators,
      },
      upcomingBaptisms: upcomingBaptisms.map((i) => ({
        id: i.id,
        name: i.fullName,
        area: i.area?.name,
        date: i.baptismGoalDate,
        status: i.status,
      })),
      areaStats,
      goals,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
