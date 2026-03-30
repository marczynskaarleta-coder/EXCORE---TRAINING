'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission, requireResourceAccess } from '@/modules/shared/access'
import {
  findProgramsByProduct,
  findProgramById,
  insertProgram,
  updateProgramById,
  insertModule,
  updateModuleById,
  deleteModuleById,
  getModuleCount,
  findLessonById,
  findLessonWithContext,
  insertLesson,
  updateLessonById,
  deleteLessonById,
  getLessonCount,
  findLessonProgress,
  findUserLessonProgress,
  upsertLessonProgress,
  countPublishedLessons,
} from './repository'
import { updateEnrollmentById } from '@/modules/training/enrollments/repository'

// =============================================
// Programs
// =============================================

export async function getPrograms(productId: string) {
  return findProgramsByProduct(productId)
}

export async function getProgram(programId: string) {
  return findProgramById(programId)
}

export async function createProgram(workspaceId: string, productId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'program.create')
  if ('error' in auth) return { error: auth.error }

  const name = formData.get('name') as string
  if (!name || name.length < 2) return { error: 'Nazwa musi miec min. 2 znaki' }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  const { data, error } = await insertProgram({
    product_id: productId,
    workspace_id: workspaceId,
    name,
    slug,
    description: formData.get('description') as string || undefined,
  })

  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

export async function updateProgram(workspaceId: string, programId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'program.edit')
  if ('error' in auth) return { error: auth.error }

  const updates: Record<string, unknown> = {}
  const name = formData.get('name')
  const description = formData.get('description')
  const status = formData.get('status')

  if (name) updates.name = name
  if (description !== null) updates.description = description || null
  if (status) updates.status = status

  const { error } = await updateProgramById(programId, updates)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Modules
// =============================================

export async function addModule(workspaceId: string, programId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'program.edit')
  if ('error' in auth) return { error: auth.error }

  const title = formData.get('title') as string
  if (!title || title.length < 1) return { error: 'Tytul jest wymagany' }

  const currentCount = await getModuleCount(programId)

  const { data, error } = await insertModule({
    program_id: programId,
    workspace_id: workspaceId,
    title,
    description: formData.get('description') as string || undefined,
    sort_order: currentCount,
  })

  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

export async function editModule(workspaceId: string, moduleId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'program.edit')
  if ('error' in auth) return { error: auth.error }

  const updates: Record<string, unknown> = {}
  const title = formData.get('title')
  const description = formData.get('description')

  if (title) updates.title = title
  if (description !== null) updates.description = description || null

  const { error } = await updateModuleById(moduleId, updates)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function removeModule(workspaceId: string, moduleId: string) {
  const auth = await requirePermission(workspaceId, 'program.edit')
  if ('error' in auth) return { error: auth.error }

  const { error } = await deleteModuleById(moduleId)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Lessons
// =============================================

export async function getLesson(lessonId: string) {
  return findLessonById(lessonId)
}

export async function getLessonWithContext(lessonId: string) {
  return findLessonWithContext(lessonId)
}

export async function addLesson(workspaceId: string, moduleId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'lesson.create')
  if ('error' in auth) return { error: auth.error }

  const title = formData.get('title') as string
  if (!title) return { error: 'Tytul jest wymagany' }

  const type = (formData.get('type') as string) || 'text'
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const currentCount = await getLessonCount(moduleId)

  const { data, error } = await insertLesson({
    module_id: moduleId,
    workspace_id: workspaceId,
    type,
    title,
    slug,
    sort_order: currentCount,
  })

  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

export async function editLesson(workspaceId: string, lessonId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'lesson.edit')
  if ('error' in auth) return { error: auth.error }

  const updates: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key === 'is_published' || key === 'is_free_preview') {
      updates[key] = value === 'true'
    } else if (key === 'duration_minutes') {
      updates[key] = value ? parseInt(value as string, 10) : null
    } else {
      updates[key] = value || null
    }
  }

  const { error } = await updateLessonById(lessonId, updates)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

export async function removeLesson(workspaceId: string, lessonId: string) {
  const auth = await requirePermission(workspaceId, 'lesson.edit')
  if ('error' in auth) return { error: auth.error }

  const { error } = await deleteLessonById(lessonId)
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Progress tracking
// =============================================

export async function getLessonProgress(enrollmentId: string) {
  return findLessonProgress(enrollmentId)
}

export async function recordLessonView(
  enrollmentId: string,
  lessonId: string,
  userId: string,
  workspaceId: string
) {
  // Only update last_seen_at, don't change status if already completed
  const existing = await findUserLessonProgress(userId, lessonId, enrollmentId)

  if (existing?.status === 'completed') return { success: true }

  const { error } = await upsertLessonProgress({
    enrollment_id: enrollmentId,
    lesson_id: lessonId,
    user_id: userId,
    workspace_id: workspaceId,
    status: existing ? 'in_progress' : 'not_started',
    last_seen_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function markLessonComplete(
  enrollmentId: string,
  lessonId: string,
  userId: string,
  workspaceId: string
) {
  const { error } = await upsertLessonProgress({
    enrollment_id: enrollmentId,
    lesson_id: lessonId,
    user_id: userId,
    workspace_id: workspaceId,
    status: 'completed',
    progress_percent: 100,
    completed_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  // Recalculate enrollment progress
  const allProgress = await findLessonProgress(enrollmentId)
  const completedCount = allProgress.filter(p => p.status === 'completed').length

  const lesson = await findLessonById(lessonId)
  if (!lesson) return { success: true }

  const context = await findLessonWithContext(lessonId)
  if (!context?.program) return { success: true }

  const totalLessons = await countPublishedLessons(context.program.id)
  const percent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0

  await updateEnrollmentById(enrollmentId, {
    progress_percent: percent,
    ...(percent === 100 ? { status: 'completed', ended_at: new Date().toISOString() } : {}),
  })

  // Fire automation trigger
  const { fireTrigger } = await import('@/modules/training/automations/engine')
  await fireTrigger({
    trigger: 'lesson_completed',
    workspace_id: workspaceId,
    user_id: userId,
    data: {
      lesson_id: lessonId,
      lesson_title: lesson.title,
      product_id: context.program.product_id,
      progress_percent: percent,
    },
  })

  revalidatePath('/app')
  return { success: true, progress_percent: percent }
}
