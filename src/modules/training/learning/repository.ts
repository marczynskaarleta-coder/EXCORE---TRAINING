import { createClient } from '@/lib/shared/supabase/server'
import type { ProgramWithModules, Lesson, LessonProgress } from './types'

// =============================================
// Programs
// =============================================

export async function findProgramsByProduct(productId: string): Promise<ProgramWithModules[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('programs')
    .select(`
      *,
      program_modules (
        *,
        lessons (*)
      )
    `)
    .eq('product_id', productId)
    .order('position', { ascending: true })

  // Sort nested modules and lessons
  const programs = (data as ProgramWithModules[]) || []
  for (const prog of programs) {
    prog.program_modules?.sort((a, b) => a.sort_order - b.sort_order)
    for (const mod of prog.program_modules || []) {
      mod.lessons?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
  }

  return programs
}

export async function findProgramById(programId: string): Promise<ProgramWithModules | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('programs')
    .select(`
      *,
      program_modules (
        *,
        lessons (*)
      )
    `)
    .eq('id', programId)
    .single()

  if (!data) return null

  const program = data as ProgramWithModules
  program.program_modules?.sort((a, b) => a.sort_order - b.sort_order)
  for (const mod of program.program_modules || []) {
    mod.lessons?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  return program
}

export async function insertProgram(input: {
  product_id: string
  workspace_id: string
  name: string
  slug: string
  description?: string
  position?: number
}) {
  const supabase = await createClient()
  return supabase.from('programs').insert(input).select().single()
}

export async function updateProgramById(programId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('programs').update(updates).eq('id', programId)
}

// =============================================
// Modules
// =============================================

export async function insertModule(input: {
  program_id: string
  workspace_id: string
  title: string
  description?: string
  sort_order: number
}) {
  const supabase = await createClient()
  return supabase.from('program_modules').insert(input).select().single()
}

export async function updateModuleById(moduleId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('program_modules').update(updates).eq('id', moduleId)
}

export async function deleteModuleById(moduleId: string) {
  const supabase = await createClient()
  return supabase.from('program_modules').delete().eq('id', moduleId)
}

export async function getModuleCount(programId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('program_modules')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', programId)
  return count || 0
}

// =============================================
// Lessons
// =============================================

export async function findLessonById(lessonId: string): Promise<Lesson | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()

  return data as Lesson | null
}

export async function findLessonWithContext(lessonId: string) {
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()

  if (!lesson) return null

  // Get module -> program -> product chain
  const { data: mod } = await supabase
    .from('program_modules')
    .select('id, title, program_id')
    .eq('id', lesson.module_id)
    .single()

  if (!mod) return null

  const { data: program } = await supabase
    .from('programs')
    .select('id, name, product_id, workspace_id')
    .eq('id', mod.program_id)
    .single()

  return {
    lesson: lesson as Lesson,
    module: mod,
    program,
  }
}

export async function insertLesson(input: {
  module_id: string
  workspace_id: string
  type: string
  title: string
  slug: string
  sort_order: number
}) {
  const supabase = await createClient()
  return supabase.from('lessons').insert(input).select().single()
}

export async function updateLessonById(lessonId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('lessons').update(updates).eq('id', lessonId)
}

export async function deleteLessonById(lessonId: string) {
  const supabase = await createClient()
  return supabase.from('lessons').delete().eq('id', lessonId)
}

export async function getLessonCount(moduleId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('module_id', moduleId)
  return count || 0
}

// =============================================
// Progress
// =============================================

export async function findLessonProgress(enrollmentId: string): Promise<LessonProgress[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('enrollment_id', enrollmentId)

  return (data as LessonProgress[]) || []
}

export async function findUserLessonProgress(
  userId: string,
  lessonId: string,
  enrollmentId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .eq('enrollment_id', enrollmentId)
    .single()

  return data as LessonProgress | null
}

export async function upsertLessonProgress(input: {
  enrollment_id: string
  lesson_id: string
  user_id: string
  workspace_id: string
  status: string
  progress_percent?: number
  completed_at?: string | null
  last_seen_at?: string
}) {
  const supabase = await createClient()

  return supabase.from('lesson_progress').upsert({
    last_seen_at: new Date().toISOString(),
    ...input,
  }, {
    onConflict: 'lesson_id,user_id,enrollment_id',
  })
}

export async function countPublishedLessons(programId: string): Promise<number> {
  const supabase = await createClient()

  const { data: modules } = await supabase
    .from('program_modules')
    .select('id')
    .eq('program_id', programId)

  if (!modules || modules.length === 0) return 0

  const moduleIds = modules.map(m => m.id)
  const { count } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .in('module_id', moduleIds)
    .eq('is_published', true)

  return count || 0
}
