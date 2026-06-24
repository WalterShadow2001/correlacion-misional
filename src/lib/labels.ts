import type {
  InvestigatorStatus,
  MissionaryType,
  MissionaryRole,
  GoalType,
  AgendaItemStatus,
} from './types'

export const STATUS_LABELS: Record<InvestigatorStatus, string> = {
  NUEVO: 'Nuevo',
  EN_PROGRESO: 'En progreso',
  FECHA_BAUTISMO: 'Fecha de bautismo',
  BAUTIZADO: 'Bautizado',
  INACTIVO: 'Inactivo',
}

export const STATUS_COLORS: Record<InvestigatorStatus, string> = {
  NUEVO: 'bg-sky-100 text-sky-800 border-sky-200',
  EN_PROGRESO: 'bg-amber-100 text-amber-800 border-amber-200',
  FECHA_BAUTISMO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  BAUTIZADO: 'bg-teal-600 text-white border-teal-700',
  INACTIVO: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const MISSIONARY_TYPE_LABELS: Record<MissionaryType, string> = {
  ELDER: 'Elder',
  HERMANA: 'Hermana',
  PAREJA: 'Pareja',
}

export const MISSIONARY_ROLE_LABELS: Record<MissionaryRole, string> = {
  LIDER: 'Líder',
  SENIOR: 'Senior',
  JUNIOR: 'Junior',
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  BAUTISMOS: 'Bautismos',
  LECCIONES: 'Lecciones enseñadas',
  INVESTIGADORES_NUEVOS: 'Investigadores nuevos',
  ASISTENCIA_IGLESIA: 'Asistencia a la Iglesia',
  REFERENCIAS: 'Referencias recibidas',
}

export const AGENDA_STATUS_LABELS: Record<AgendaItemStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  COMPLETADO: 'Completado',
}

export const AGENDA_STATUS_COLORS: Record<AgendaItemStatus, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 border-amber-200',
  EN_PROGRESO: 'bg-sky-100 text-sky-800 border-sky-200',
  COMPLETADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export const LESSON_TITLES = [
  '1. La Restauración del Evangelio',
  '2. El Plan de Salvación',
  '3. El Evangelio de Jesucristo',
  '4. El Mandamiento de los Diezmos',
  '5. La Ley de Castidad y la Familia',
]

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatDateLong(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
