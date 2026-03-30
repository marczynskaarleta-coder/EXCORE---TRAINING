// =============================================
// Enrollments - Zapis na produkty
// Tabela: enrollments
// Kluczowa zmiana: user_id (auth.users) zamiast member_id
// =============================================

export type EnrollmentSource = 'purchase' | 'manual' | 'invite' | 'corporate_assignment' | 'automation'

export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'cancelled' | 'expired'

export interface Enrollment {
  id: string
  workspace_id: string
  product_id: string
  user_id: string
  plan_id: string | null
  source: EnrollmentSource
  status: EnrollmentStatus
  started_at: string
  ended_at: string | null
  expires_at: string | null
  progress_percent: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EnrollmentWithProduct extends Enrollment {
  products?: {
    id: string
    name: string
    slug: string
    type: string
    cover_image_url: string | null
  } | null
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Aktywny',
  completed: 'Ukonczony',
  paused: 'Wstrzymany',
  cancelled: 'Anulowany',
  expired: 'Wygasly',
}

export const ENROLLMENT_SOURCE_LABELS: Record<EnrollmentSource, string> = {
  purchase: 'Zakup',
  manual: 'Reczny',
  invite: 'Zaproszenie',
  corporate_assignment: 'Przypisanie korporacyjne',
  automation: 'Automatyzacja',
}
