import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Si hay TURSO_AUTH_TOKEN, usamos libSQL (Turso); si no, SQLite local
  const url = process.env.DATABASE_URL || 'file:./db/local.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (url.startsWith('libsql') || url.startsWith('http')) {
    if (!authToken) {
      console.warn('⚠️  TURSO_AUTH_TOKEN no está configurado pero DATABASE_URL apunta a Turso.')
    }
    const libsql = createClient({ url, authToken })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Modo local: SQLite en archivo, sin adapter
  return new PrismaClient({ log: ['error', 'warn'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
