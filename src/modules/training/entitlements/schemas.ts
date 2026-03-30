import { z } from 'zod'

export const checkAccessSchema = z.object({
  product_id: z.string().uuid(),
  member_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
})

export const checkLessonAccessSchema = z.object({
  lesson_id: z.string().uuid(),
  member_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
})

export type CheckAccessInput = z.infer<typeof checkAccessSchema>
export type CheckLessonAccessInput = z.infer<typeof checkLessonAccessSchema>
