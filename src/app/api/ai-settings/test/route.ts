import { NextResponse } from 'next/server'
import { testAIConnection } from '@/lib/ai'

export async function POST() {
  const result = await testAIConnection()
  return NextResponse.json(result)
}
