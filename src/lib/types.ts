// Tipos compartidos para el sistema de correlación misional

export type InvestigatorStatus =
  | 'NUEVO'
  | 'EN_PROGRESO'
  | 'FECHA_BAUTISMO'
  | 'BAUTIZADO'
  | 'INACTIVO'

export type MissionaryType = 'ELDER' | 'HERMANA' | 'PAREJA'
export type MissionaryRole = 'LIDER' | 'SENIOR' | 'JUNIOR'
export type GoalType =
  | 'BAUTISMOS'
  | 'LECCIONES'
  | 'INVESTIGADORES_NUEVOS'
  | 'ASISTENCIA_IGLESIA'
  | 'REFERENCIAS'
export type AgendaItemStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO'

export interface Zone {
  id: string
  name: string
  description?: string | null
  areas?: Area[]
}

export interface Area {
  id: string
  name: string
  zoneId: string
  zone?: Zone
  companionships?: Companionship[]
  investigators?: Investigator[]
  _count?: { investigators: number; companionships: number }
}

export interface Missionary {
  id: string
  firstName: string
  lastName: string
  fullName: string
  type: MissionaryType
  role: MissionaryRole
  phone?: string | null
  email?: string | null
}

export interface Companionship {
  id: string
  areaId: string
  area?: Area
  missionaires: Missionary[]
  startDate: string
  endDate?: string | null
  active: boolean
}

export interface TeachingProgress {
  id: string
  lessonNumber: number
  lessonTitle: string
  completed: boolean
  completedDate?: string | null
  notes?: string | null
}

export interface Investigator {
  id: string
  firstName: string
  lastName: string
  fullName: string
  phone?: string | null
  address?: string | null
  areaId: string
  area?: Area
  status: InvestigatorStatus
  source?: string | null
  referredBy?: string | null
  baptismDate?: string | null
  baptismGoalDate?: string | null
  lessonsReceived: number
  churchAttendance: number
  lastVisitDate?: string | null
  notes?: string | null
  progress?: TeachingProgress[]
  createdAt: string
}

export interface AgendaItem {
  id: string
  meetingId: string
  investigatorId?: string | null
  topic: string
  discussion?: string | null
  action?: string | null
  responsible?: string | null
  dueDate?: string | null
  status: AgendaItemStatus
}

export interface CorrelationMeeting {
  id: string
  areaId?: string | null
  area?: Area | null
  meetingDate: string
  leader: string
  attendees?: string | null
  vision?: string | null
  priorities?: string | null
  notes?: string | null
  commitments?: string | null
  agendaItems?: AgendaItem[]
}

export interface Goal {
  id: string
  areaId: string
  area?: Area
  period: string
  goalType: GoalType
  target: number
  actual: number
}

export interface Fellowshipper {
  id: string
  name: string
  phone?: string | null
  areaId?: string | null
  assignedTo?: string | null
  active: boolean
}

export interface Stats {
  totals: {
    zones: number
    areas: number
    baptized: number
    baptismsThisMonth: number
    meetings: number
    investigatorsByStatus: { status: InvestigatorStatus; _count: number }[]
  }
  upcomingBaptisms: {
    id: string
    name: string
    area?: string
    date: string
    status: InvestigatorStatus
  }[]
  areaStats: {
    id: string
    name: string
    zone: string
    companions: string
    activeInvestigators: number
    baptizedInArea: number
    totalInvestigators: number
  }[]
  goals: Goal[]
}
