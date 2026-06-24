import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    let settings = await db.aISettings.findUnique({ where: { id: 'default' } })
    if (!settings) {
      settings = await db.aISettings.create({ data: { id: 'default' } })
    }
    return NextResponse.json({
      enabled: settings.enabled,
      provider: settings.provider,
      hasCustomApiKey: !!settings.apiKey,
      hasCustomSystemPrompt: !!settings.customSystemPrompt,
      customSystemPrompt: settings.customSystemPrompt || '',
      language: settings.language,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {
      enabled: body.enabled,
      provider: body.provider,
      language: body.language,
    }
    if (body.customSystemPrompt !== undefined) {
      data.customSystemPrompt = body.customSystemPrompt?.trim() || null
    }
    // apiKey se maneja por separado para no sobreescribir si no se envía
    if (body.apiKey !== undefined) {
      data.apiKey = body.apiKey?.trim() || null
    }

    const settings = await db.aISettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    })

    return NextResponse.json({
      enabled: settings.enabled,
      provider: settings.provider,
      hasCustomApiKey: !!settings.apiKey,
      hasCustomSystemPrompt: !!settings.customSystemPrompt,
      customSystemPrompt: settings.customSystemPrompt || '',
      language: settings.language,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
