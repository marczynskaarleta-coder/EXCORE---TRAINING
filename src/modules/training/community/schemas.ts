import { z } from 'zod'

export const createSpaceSchema = z.object({
  name: z.string().min(2, 'Nazwa musi miec min. 2 znaki').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['general', 'product', 'cohort', 'topic', 'announcements', 'qa']).default('general'),
  visibility: z.enum(['public', 'members_only', 'product_access', 'invite_only']).default('members_only'),
  product_id: z.string().uuid().nullable().optional(),
})

export const createPostSchema = z.object({
  space_id: z.string().uuid(),
  title: z.string().max(300).optional(),
  content: z.string().min(1, 'Tresc jest wymagana').max(10000),
  type: z.enum(['discussion', 'question', 'announcement', 'poll', 'resource']).default('discussion'),
})

export const createCommentSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parent_id: z.string().uuid().nullable().optional(),
})

export const toggleReactionSchema = z.object({
  target_type: z.enum(['post', 'comment']),
  target_id: z.string().uuid(),
  emoji: z.enum(['heart', 'thumbsup', 'fire', 'clap', 'thinking', 'rocket']),
})

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
