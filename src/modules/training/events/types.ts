// =============================================
// Events - Wydarzenia edukacyjne
// Tabele: events, event_registrations
// Zmiana: event_registrations zamiast event_rsvps
// =============================================

export type EventType = 'live' | 'webinar' | 'office_hours' | 'workshop' | 'onsite'

export type EventStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled'

export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show'

export interface TrainingEvent {
  id: string
  workspace_id: string
  product_id: string | null
  title: string
  description: string | null
  type: EventType
  status: EventStatus
  starts_at: string
  ends_at: string | null
  timezone: string
  location: string | null
  meeting_url: string | null
  replay_url: string | null
  capacity: number | null
  is_free: boolean
  cover_image_url: string | null
  host_id: string | null
  metadata: Record<string, unknown>
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  workspace_id: string
  status: RegistrationStatus
  registered_at: string
  attended_at: string | null
  cancelled_at: string | null
  metadata: Record<string, unknown>
}

export interface EventWithHost extends TrainingEvent {
  host?: { id: string; display_name: string; avatar_url: string | null } | null
  event_registrations?: { count: number }[]
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live: 'Na zywo',
  webinar: 'Webinar',
  office_hours: 'Dyzur',
  workshop: 'Warsztat',
  onsite: 'Stacjonarnie',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Szkic',
  scheduled: 'Zaplanowane',
  live: 'Na zywo',
  completed: 'Zakonczone',
  cancelled: 'Odwolane',
}

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  registered: 'Zarejestrowany',
  waitlisted: 'Lista rezerwowa',
  cancelled: 'Anulowany',
  attended: 'Uczestniczyl',
  no_show: 'Nieobecny',
}
