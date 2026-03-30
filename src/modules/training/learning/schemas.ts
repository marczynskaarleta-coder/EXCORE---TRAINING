import { z } from 'zod'

export const createModuleSchema = z.object({
  product_id: z.string().uuid(),
  title: z.string().min(1, 'Tytul jest wymagany').max(200),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0).default(0),
})

export const createLessonSchema = z.object({
  module_id: z.string().uuid(),
  product_id: z.string().uuid(),
  type: z.enum([
    'video', 'text', 'audio', 'quiz', 'assignment',
    'live_session', 'download', 'embed',
  ]).default('text'),
  title: z.string().min(1, 'Tytul jest wymagany').max(200),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0).default(0),
})

export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  content: z.string().optional(), // rich text HTML
  video_url: z.string().url().nullable().optional(),
  video_type: z.string().nullable().optional(),
  audio_url: z.string().url().nullable().optional(),
  duration_minutes: z.number().int().min(0).nullable().optional(),
  is_published: z.boolean().optional(),
  is_free_preview: z.boolean().optional(),
  quiz_data: z.record(z.string(), z.unknown()).nullable().optional(),
  assignment_instructions: z.string().nullable().optional(),
})

export const markCompleteSchema = z.object({
  enrollment_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  member_id: z.string().uuid(),
})

export type CreateModuleInput = z.infer<typeof createModuleSchema>
export type CreateLessonInput = z.infer<typeof createLessonSchema>
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
