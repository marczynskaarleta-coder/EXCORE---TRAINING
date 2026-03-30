import { z } from 'zod'

export const enrollMemberSchema = z.object({
  product_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  source: z.enum(['purchase', 'manual', 'invite', 'corporate_assignment', 'automation']).default('manual'),
  plan_id: z.string().uuid().nullable().optional(),
})

export const updateEnrollmentSchema = z.object({
  status: z.enum(['active', 'completed', 'paused', 'cancelled', 'expired']).optional(),
  expires_at: z.string().datetime().nullable().optional(),
})

export type EnrollMemberInput = z.infer<typeof enrollMemberSchema>
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>
