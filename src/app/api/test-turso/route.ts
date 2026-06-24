import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  try {
    const url = process.env.DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    console.log('[test-turso] URL:', url)
    console.log('[test-turso] Token set:', !!authToken)

    if (!url) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
    }

    const client = createClient({ url, authToken })
    const result = await client.execute('SELECT name FROM sqlite_master WHERE type=? ORDER BY name', ['table'])
    return NextResponse.json({
      ok: true,
      tables: result.rows.map((r) => r.name),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, stack: (e as Error).stack }, { status: 500 })
  }
}
