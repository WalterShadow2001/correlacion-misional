import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  console.log('[db] createPrismaClient called', {
    url: url ? `${url.slice(0, 40)}...` : 'undefined',
    authToken: authToken ? '[set]' : 'undefined',
    NODE_ENV: process.env.NODE_ENV,
  })

  // Modo local con SQLite en archivo
  if (!url || url.startsWith('file:')) {
    console.log('[db] Using local SQLite mode')
    return new PrismaClient({ log: ['error', 'warn'] })
  }

  // Modo Turso / libSQL — v7 API: pasar configuración al adaptador directamente
  if (url.startsWith('libsql://') || url.startsWith('http')) {
    console.log('[db] Using Turso libSQL adapter (v7 API)')
    const adapter = new PrismaLibSql({ url, authToken })
    return new PrismaClient({ adapter })
  }

  throw new Error(`[db] Unsupported DATABASE_URL scheme: ${url}`)
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) globalForPrisma.prisma = db
