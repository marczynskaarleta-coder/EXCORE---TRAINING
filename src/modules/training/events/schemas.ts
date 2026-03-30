import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(2, 'Tytul musi miec min. 2 znaki').max(200),
  description: z.string().max(5000).optional(),
  type: z.enum([
    'webinar', 'workshop', 'live_session', 'meetup',
    'conference', 'ama', 'office_hours', 'custom',
  ]).default('webinar'),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  is_online: z.boolean().default(true),
  location_url: z.string().url().optional(),
  location_address: z.string().max(500).optional(),
  max_attendees: z.number().int().min(1).nullable().optional(),
  requires_rsvp: z.boolean().default(true),
  host_id: z.string().uuid().optional(),
  product_id: z.string().uuid().nullable().optional(),
})

export const rsvpSchema = z.object({
  event_id: z.string().uuid(),
  member_id: z.string().uuid(),
  status: z.enum(['going', 'maybe', 'not_going']),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type RsvpInput = z.infer<typeof rsvpSchema>
