import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { SuggestedInvestigator, SuggestedBaptismEvent } from '@/lib/ai'

// POST: aplicar sugerencias de la IA — crea investigadores y actualiza calendario
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as {
      investigators?: SuggestedInvestigator[]
      baptisms?: SuggestedBaptismEvent[]
    }

    // Obtener todas las áreas para mapear nombres → IDs
    const areas = await db.area.findMany()
    const areaByName = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]))

    // === 1) Crear investigadores ===
    const createdInvestigators: Array<{ name: string; area: string; status: string; created: boolean; reason?: string }> = []

    for (const inv of (body.investigators || [])) {
      const areaId = areaByName.get((inv.areaName || '').toLowerCase())
      if (!areaId) {
        createdInvestigators.push({
          name: `${inv.firstName} ${inv.lastName}`,
          area: inv.areaName,
          status: inv.status,
          created: false,
          reason: `Área "${inv.areaName}" no encontrada`,
        })
        continue
      }

      // Verificar si ya existe un investigador con el mismo nombre en la misma área
      const fullName = `${inv.firstName} ${inv.lastName}`.trim()
      const existing = await db.investigator.findFirst({
        where: { fullName: { equals: fullName }, areaId },
      })
      if (existing) {
        createdInvestigators.push({
          name: fullName,
          area: inv.areaName,
          status: inv.status,
          created: false,
          reason: 'Ya existe un investigador con este nombre en el área',
        })
        continue
      }

      // Crear el investigador
      const created = await db.investigator.create({
        data: {
          firstName: inv.firstName,
          lastName: inv.lastName,
          fullName,
          phone: inv.phone || null,
          address: inv.address || null,
          areaId,
          status: inv.status,
          source: inv.source || null,
          referredBy: inv.referredBy || null,
          baptismGoalDate: inv.baptismGoalDate ? new Date(inv.baptismGoalDate) : null,
          baptismDate: inv.baptismDate ? new Date(inv.baptismDate) : null,
          notes: inv.notes || null,
        },
      })

      // Pre-cargar las 5 lecciones misionales
      const LESSON_TITLES = [
        '1. La Restauración del Evangelio',
        '2. El Plan de Salvación',
        '3. El Evangelio de Jesucristo',
        '4. El Mandamiento de los Diezmos',
        '5. La Ley de Castidad y la Familia',
      ]
      await db.teachingProgress.createMany({
        data: LESSON_TITLES.map((title, i) => ({
          investigatorId: created.id,
          lessonNumber: i + 1,
          lessonTitle: title,
        })),
      })

      createdInvestigators.push({
        name: fullName,
        area: inv.areaName,
        status: inv.status,
        created: true,
      })
    }

    // === 2) Actualizar bautismos / fechas objetivo ===
    const baptismUpdates: Array<{ investigator: string; date: string; tentative: boolean; updated: boolean; reason?: string }> = []

    for (const bap of (body.baptisms || [])) {
      const areaId = areaByName.get((bap.areaName || '').toLowerCase())
      if (!areaId) {
        baptismUpdates.push({
          investigator: bap.investigatorName,
          date: bap.date,
          tentative: bap.isTentative,
          updated: false,
          reason: `Área "${bap.areaName}" no encontrada`,
        })
        continue
      }

      // Buscar investigador por nombre en el área
      const investigator = await db.investigator.findFirst({
        where: { fullName: { equals: bap.investigatorName }, areaId },
      })
      if (!investigator) {
        baptismUpdates.push({
          investigator: bap.investigatorName,
          date: bap.date,
          tentative: bap.isTentative,
          updated: false,
          reason: 'Investigador no encontrado (se debe crear primero)',
        })
        continue
      }

      // Actualizar fecha
      const updateData: { baptismGoalDate?: Date; baptismDate?: Date; status?: string } = {}
      if (bap.isTentative) {
        updateData.baptismGoalDate = new Date(bap.date)
        // Si está tentativo, aseguramos que el status sea FECHA_BAUTISMO
        if (investigator.status === 'NUEVO' || investigator.status === 'EN_PROGRESO') {
          updateData.status = 'FECHA_BAUTISMO'
        }
      } else {
        // Bautismo confirmado
        updateData.baptismDate = new Date(bap.date)
        updateData.baptismGoalDate = new Date(bap.date)
        updateData.status = 'BAUTIZADO'
      }

      await db.investigator.update({
        where: { id: investigator.id },
        data: updateData,
      })

      baptismUpdates.push({
        investigator: bap.investigatorName,
        date: bap.date,
        tentative: bap.isTentative,
        updated: true,
      })
    }

    return NextResponse.json({
      ok: true,
      summary: {
        investigatorsCreated: createdInvestigators.filter((i) => i.created).length,
        investigatorsSkipped: createdInvestigators.filter((i) => !i.created).length,
        baptismsUpdated: baptismUpdates.filter((b) => b.updated).length,
        baptismsSkipped: baptismUpdates.filter((b) => !b.updated).length,
      },
      details: {
        investigators: createdInvestigators,
        baptisms: baptismUpdates,
      },
    })
  } catch (e) {
    console.error('apply error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
