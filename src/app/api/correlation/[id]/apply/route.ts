import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { SuggestedInvestigator, SuggestedBaptismEvent, SuggestedFamilyMember } from '@/lib/ai'

// POST: aplicar sugerencias de la IA — crea investigadores, familiares y actualiza calendario
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as {
      investigators?: SuggestedInvestigator[]
      baptisms?: SuggestedBaptismEvent[]
    }

    const areas = await db.area.findMany()
    const areaByName = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]))

    // === 1) Crear investigadores + familiares ===
    const createdInvestigators: Array<{
      name: string
      area: string
      status: string
      personType?: string
      created: boolean
      familyCreated?: number
      reason?: string
    }> = []

    for (const inv of (body.investigators || [])) {
      const areaId = areaByName.get((inv.areaName || '').toLowerCase())
      if (!areaId) {
        createdInvestigators.push({
          name: `${inv.firstName} ${inv.lastName}`,
          area: inv.areaName,
          status: inv.status,
          personType: inv.personType,
          created: false,
          reason: `Área "${inv.areaName}" no encontrada`,
        })
        continue
      }

      const fullName = `${inv.firstName} ${inv.lastName}`.trim()
      const existing = await db.investigator.findFirst({
        where: { fullName: { equals: fullName }, areaId },
      })
      if (existing) {
        // Si ya existe, actualizamos campos relevantes (fecha de bautismo, etc.)
        const updateData: Record<string, unknown> = {}
        if (inv.baptismGoalDate) updateData.baptismGoalDate = new Date(inv.baptismGoalDate)
        if (inv.baptismDate) updateData.baptismDate = new Date(inv.baptismDate)
        if (inv.notes && !existing.notes) updateData.notes = inv.notes
        if (inv.phone && !existing.phone) updateData.phone = inv.phone
        if (inv.address && !existing.address) updateData.address = inv.address
        if (inv.referredBy && !existing.referredBy) updateData.referredBy = inv.referredBy

        // Crear familiares si no existen
        let familyCreated = 0
        if (inv.familyMembers && inv.familyMembers.length > 0) {
          for (const fm of inv.familyMembers) {
            const existingFm = await db.familyMember.findFirst({
              where: { investigatorId: existing.id, name: fm.name },
            })
            if (!existingFm) {
              await db.familyMember.create({
                data: {
                  investigatorId: existing.id,
                  name: fm.name,
                  age: fm.age || null,
                  isMember: fm.isMember,
                  isInvestigator: fm.isInvestigator,
                  relationship: fm.relationship || null,
                  notes: fm.notes || null,
                },
              })
              familyCreated++
            }
          }
        }

        if (Object.keys(updateData).length > 0 || familyCreated > 0) {
          if (Object.keys(updateData).length > 0) {
            await db.investigator.update({ where: { id: existing.id }, data: updateData })
          }
          createdInvestigators.push({
            name: fullName,
            area: inv.areaName,
            status: inv.status,
            personType: inv.personType,
            created: false,
            familyCreated,
            reason: 'Ya existía — se actualizaron datos y/o familiares',
          })
        } else {
          createdInvestigators.push({
            name: fullName,
            area: inv.areaName,
            status: inv.status,
            personType: inv.personType,
            created: false,
            reason: 'Ya existía sin cambios',
          })
        }
        continue
      }

      // Crear nuevo investigador
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

      // Crear familiares
      let familyCreated = 0
      if (inv.familyMembers && inv.familyMembers.length > 0) {
        for (const fm of inv.familyMembers) {
          await db.familyMember.create({
            data: {
              investigatorId: created.id,
              name: fm.name,
              age: fm.age || null,
              isMember: fm.isMember,
              isInvestigator: fm.isInvestigator,
              relationship: fm.relationship || null,
              notes: fm.notes || null,
            },
          })
          familyCreated++
        }
      }

      createdInvestigators.push({
        name: fullName,
        area: inv.areaName,
        status: inv.status,
        personType: inv.personType,
        created: true,
        familyCreated,
      })
    }

    // === 2) Actualizar bautismos / fechas objetivo ===
    const baptismUpdates: Array<{
      investigator: string
      date: string
      tentative: boolean
      updated: boolean
      reason?: string
    }> = []

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

      const updateData: { baptismGoalDate?: Date; baptismDate?: Date; status?: string } = {}
      if (bap.isTentative) {
        updateData.baptismGoalDate = new Date(bap.date)
        if (investigator.status === 'NUEVO' || investigator.status === 'EN_PROGRESO') {
          updateData.status = 'FECHA_BAUTISMO'
        }
      } else {
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
        investigatorsUpdated: createdInvestigators.filter((i) => !i.created && i.familyCreated && i.familyCreated > 0).length,
        investigatorsSkipped: createdInvestigators.filter((i) => !i.created && (!i.familyCreated || i.familyCreated === 0)).length,
        familyMembersCreated: createdInvestigators.reduce((acc, i) => acc + (i.familyCreated || 0), 0),
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
