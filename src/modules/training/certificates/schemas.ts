import { z } from 'zod'

export const issueCertificateSchema = z.object({
  enrollment_id: z.string().uuid(),
  product_id: z.string().uuid(),
  member_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  html_template: z.string().min(1),
  css: z.string().nullable().optional(),
  background_url: z.string().url().nullable().optional(),
  is_default: z.boolean().default(false),
})

export const verifyCertificateSchema = z.object({
  certificate_number: z.string().min(1),
})

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
