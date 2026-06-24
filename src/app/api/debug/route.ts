import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 50) : 'NOT_SET',
    TURSO_AUTH_TOKEN_set: !!process.env.TURSO_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  })
}
