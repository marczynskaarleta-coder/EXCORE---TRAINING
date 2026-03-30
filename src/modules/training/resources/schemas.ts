import { z } from 'zod'

export const createResourceSchema = z.object({
  title: z.string().min(1, 'Tytul jest wymagany').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum([
    'pdf', 'template', 'workbook', 'checklist', 'sop',
    'recording', 'video', 'audio', 'link', 'other',
  ]).default('other'),
  file_url: z.string().url().nullable().optional(),
  file_name: z.string().nullable().optional(),
  file_size: z.number().int().nullable().optional(),
  external_url: z.string().url().nullable().optional(),
  is_premium: z.boolean().default(false),
  product_id: z.string().uuid().nullable().optional(),
})

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  type: z.enum([
    'pdf', 'template', 'workbook', 'checklist', 'sop',
    'recording', 'video', 'audio', 'link', 'other',
  ]).optional(),
  is_premium: z.boolean().optional(),
  external_url: z.string().url().nullable().optional(),
})

export type CreateResourceInput = z.infer<typeof createResourceSchema>
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>
