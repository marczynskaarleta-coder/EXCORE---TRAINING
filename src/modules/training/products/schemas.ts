import { z } from 'zod'

// =============================================
// Product schemas
// =============================================

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nazwa musi miec min. 2 znaki').max(200, 'Nazwa max 200 znakow'),
  type: z.enum([
    'course', 'membership', 'cohort_program', 'mentoring_program',
    'resource_hub', 'bundle', 'community_access',
  ], { message: 'Nieprawidlowy typ produktu' }),
  description: z.string().max(5000, 'Opis max 5000 znakow').optional(),
  visibility: z.enum(['public', 'members', 'private']).default('members'),
})

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Nazwa musi miec min. 2 znaki').max(200).optional(),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Slug moze zawierac tylko a-z, 0-9 i myslniki').optional(),
  description: z.string().max(5000).nullable().optional(),
  cover_image_url: z.string().url('Nieprawidlowy URL obrazka').nullable().optional(),
  visibility: z.enum(['public', 'members', 'private']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// =============================================
// Plan schemas (with business rules)
// =============================================

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Nazwa planu jest wymagana').max(100),
  description: z.string().max(500).optional(),
  billing_type: z.enum(['free', 'one_time', 'subscription', 'custom'], {
    message: 'Wybierz typ platnosci',
  }),
  price_amount: z.coerce.number().int().min(0, 'Cena nie moze byc ujemna').default(0),
  currency: z.string().min(3).max(3).default('PLN'),
  interval: z.enum(['monthly', 'quarterly', 'yearly']).nullable().optional(),
  trial_days: z.coerce.number().int().min(0).max(365, 'Trial max 365 dni').default(0),
}).superRefine((data, ctx) => {
  // Business rule: one_time requires price > 0
  if (data.billing_type === 'one_time' && data.price_amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Platnosc jednorazowa wymaga ceny wiekszej niz 0',
      path: ['price_amount'],
    })
  }
  // Business rule: subscription requires price > 0 and interval
  if (data.billing_type === 'subscription') {
    if (data.price_amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subskrypcja wymaga ceny wiekszej niz 0',
        path: ['price_amount'],
      })
    }
    if (!data.interval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subskrypcja wymaga okresu rozliczeniowego',
        path: ['interval'],
      })
    }
  }
  // Business rule: free must have price = 0
  if (data.billing_type === 'free' && data.price_amount > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Darmowy plan nie moze miec ceny',
      path: ['price_amount'],
    })
  }
})

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  billing_type: z.enum(['free', 'one_time', 'subscription', 'custom']).optional(),
  price_amount: z.coerce.number().int().min(0).optional(),
  currency: z.string().min(3).max(3).optional(),
  interval: z.enum(['monthly', 'quarterly', 'yearly']).nullable().optional(),
  trial_days: z.coerce.number().int().min(0).max(365).optional(),
  is_active: z.coerce.boolean().optional(),
  position: z.coerce.number().int().min(0).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreatePlanInput = z.infer<typeof createPlanSchema>
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
