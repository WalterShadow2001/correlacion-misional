# 📖 Correlación Misional — Panel del Líder Misional

Sistema web para que el **líder misional de barrio** coordine la obra misional de varios elders/hermanas en diferentes áreas de la ciudad. Construido con Next.js 16, TypeScript, Tailwind CSS, shadcn/ui y Prisma.

## ✨ Funcionalidades

- **Dashboard**: KPIs en tiempo real — investigadores activos, bautismos del mes, áreas activas, total bautizados, distribución por estado, próximos bautismos, resumen por área y metas del período.
- **Zonas y Áreas**: organiza la ciudad en zonas (Norte, Sur, Centro, etc.) y áreas misionales dentro de cada zona. Asigna compañeros (Elder/Hermana, líder/senior/junior) a cada área.
- **Investigadores**: registro completo con teléfono, dirección, fuente, referido por, notas. Las 5 lecciones misionales estándar se pre-cargan automáticamente y se marcan con un clic.
- **Correlación**: registra reuniones semanales con líder, asistentes, visión, prioridades, compromisos y agenda detallada (tema, discusión, acción, responsable).
- **Calendario**: vista de bautismos programados y realizados, agrupados por mes, con filtros próximos/pasados/todos.
- **Metas**: define metas mensuales o trimestrales por área (bautismos, lecciones, investigadores nuevos, asistencia, referencias) y lleva el progreso con botones +/−.

## 🚀 Despliegue a producción (GitHub + Vercel + Turso)

### Paso 1 — Subir el código a GitHub

```bash
# Inicializa repo (si no existe)
git init
git add .
git commit -m "Sistema de correlación misional"

# Crea el repo en GitHub y conecta
gh repo create correlacion-misional --public --source=. --remote=origin --push
# O manualmente: crea el repo en github.com y ejecuta:
# git remote add origin https://github.com/<tu-usuario>/correlacion-misional.git
# git branch -M main
# git push -u origin main
```

### Paso 2 — Crear base de datos en Turso

```bash
# Instala la CLI de Turso
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Crea la base de datos
turso db create mision-db

# Obtén la URL de conexión
turso db show mision-db --url
# → algo como: libsql://mision-db-<tu-cuenta>.turso.io

# Genera un token de acceso
turso db tokens create mision-db
# → copia este token
```

### Paso 3 — Adaptar Prisma para Turso (libSQL)

Turso usa el driver `libSQL`. Necesitas instalar el adapter oficial de Prisma:

```bash
bun add @prisma/adapter-libsql
```

Edita `prisma/schema.prisma` y cambia el generator + datasource:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Edita `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  const libsql = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

Necesitarás también instalar `@libsql/client`:

```bash
bun add @libsql/client
```

Genera el cliente y empuja el schema a Turso:

```bash
bun run db:generate
bun run db:push
```

### Paso 4 — Desplegar en Vercel

1. Ve a https://vercel.com y conéctate con GitHub.
2. Importa el repo `correlacion-misional`.
3. En **Environment Variables**, agrega:
   - `DATABASE_URL` = `libsql://mision-db-<tu-cuenta>.turso.io`
   - `TURSO_AUTH_TOKEN` = `<el token que generaste>`
4. Build command: `bun run build` (o déjalo automático — Vercel detecta Next.js)
5. Deploy.

Tu app quedará en `https://correlacion-misional.vercel.app` (o similar).

## 🛠️ Desarrollo local

```bash
# Instalar dependencias
bun install

# Configurar entorno
cp .env.example .env.local
# por defecto usa SQLite local, no necesitas cambiar nada para desarrollo

# Crear la base de datos local
bun run db:push

# Levantar el servidor
bun run dev
# Abre http://localhost:3000
```

## 📂 Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                  # SPA principal con 6 tabs
│   ├── layout.tsx                # Layout raíz
│   └── api/
│       ├── zones/                # CRUD zonas
│       ├── areas/                # CRUD áreas
│       ├── companionships/       # Asignación de misioneros
│       ├── investigators/        # CRUD investigadores + progreso
│       ├── correlation/          # Reuniones de correlación
│       ├── goals/                # Metas misionales
│       ├── fellowshippers/       # Miembros fellowshipping
│       └── stats/                # Dashboard stats
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── missionary/               # Componentes de cada pestaña
│       ├── dashboard.tsx
│       ├── areas.tsx
│       ├── investigators.tsx
│       ├── correlation.tsx
│       ├── calendar.tsx
│       └── goals.tsx
└── lib/
    ├── db.ts                     # Cliente Prisma
    ├── types.ts                  # Tipos TypeScript compartidos
    └── labels.ts                 # Etiquetas y constantes en español
```

## 📊 Modelo de datos

- **Zone** → agrupa áreas por región de la ciudad
- **Area** → área misional dentro de una zona
- **Companionship** → compañía de misioneros asignada a un área (con historial)
- **Missionary** → elder/hermana individual
- **Investigator** → persona siendo enseñada (5 estados: nuevo, en progreso, fecha bautismo, bautizado, inactivo)
- **TeachingProgress** → las 5 lecciones misionales estándar
- **CorrelationMeeting** + **AgendaItem** → reuniones de correlación semanales
- **Goal** → metas por área y período
- **Fellowshipper** → miembros asignados a acompañar investigadores

## 🔐 Seguridad

- **Nunca** subas `.env` o `.env.local` al repositorio (ya están en `.gitignore`)
- Los tokens de Turso/Vercel/GitHub deben ir solo en los paneles de cada plataforma
- Considera agregar autenticación (NextAuth.js está incluido como dependencia) antes de exponer la app públicamente

## 📖 Contexto doctrinal

Este sistema sigue el modelo de **correlación misional** de La Iglesia de Jesucristo de los Santos de los Últimos Días, donde el líder misional de barrio coordina el trabajo de los misioneros con los líderes del sacerdocio para que los investigadores tengan fellowshipping desde el principio y la obra de retención sea efectiva.

> *"Y esta es la vida eterna: que te conozcan a ti, el único Dios verdadero, y a Jesucristo, a quien has enviado."* — Juan 17:3
