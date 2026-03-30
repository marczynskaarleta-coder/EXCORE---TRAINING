// =============================================
// Learning - Programy, moduly, lekcje, progress
// Tabele: programs, program_modules, lessons, lesson_progress
// Zmiana: programs zamiast learning_modules (dodatkowy poziom)
// product -> program(s) -> module(s) -> lesson(s)
// =============================================

export type ProgramStatus = 'draft' | 'published' | 'archived'

export type LessonType =
  | 'video' | 'text' | 'audio' | 'quiz'
  | 'assignment' | 'live_session' | 'download' | 'embed'

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'

export interface Program {
  id: string
  product_id: string
  workspace_id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  status: ProgramStatus
  position: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProgramModule {
  id: string
  program_id: string
  workspace_id: string
  title: string
  description: string | null
  sort_order: number
  unlock_after_days: number | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  workspace_id: string
  title: string
  slug: string
  type: LessonType
  content: string | null
  video_url: string | null
  audio_url: string | null
  attachment_url: string | null
  duration_minutes: number | null
  is_published: boolean
  is_free_preview: boolean
  sort_order: number
  quiz_data: Record<string, unknown> | null
  assignment_instructions: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  lesson_id: string
  user_id: string
  enrollment_id: string
  workspace_id: string
  status: LessonProgressStatus
  progress_percent: number
  completed_at: string | null
  last_seen_at: string | null
  quiz_score: number | null
  quiz_answers: Record<string, unknown> | null
  assignment_url: string | null
  assignment_grade: string | null
  time_spent_seconds: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProgramWithModules extends Program {
  program_modules?: (ProgramModule & { lessons?: Lesson[] })[]
}

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: 'Wideo',
  text: 'Tekst',
  audio: 'Audio',
  quiz: 'Quiz',
  assignment: 'Zadanie',
  live_session: 'Sesja na zywo',
  download: 'Do pobrania',
  embed: 'Osadzone',
}

export const PROGRESS_STATUS_LABELS: Record<LessonProgressStatus, string> = {
  not_started: 'Nie rozpoczeta',
  in_progress: 'W trakcie',
  completed: 'Ukonczona',
}
