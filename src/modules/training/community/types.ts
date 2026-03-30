// =============================================
// Community - Spaces, posts, komentarze, reakcje
// Dostep: workspace members + entitlement check dla product spaces
// =============================================

export type SpaceType = 'general' | 'product' | 'cohort' | 'topic' | 'announcements' | 'qa'
export type SpaceVisibility = 'public' | 'members_only' | 'product_access' | 'invite_only'
export type PostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'resource'
export type ReactionEmoji = 'heart' | 'thumbsup' | 'fire' | 'clap' | 'thinking' | 'rocket'

export interface CommunitySpace {
  id: string
  workspace_id: string
  product_id: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  type: SpaceType
  visibility: SpaceVisibility
  position: number
  is_archived: boolean
  created_by: string | null
  created_at: string
}

export interface Post {
  id: string
  space_id: string
  workspace_id: string
  author_id: string
  type: PostType
  title: string | null
  content: string
  is_pinned: boolean
  is_locked: boolean
  likes_count: number
  comments_count: number
  views_count: number
  poll_data: Record<string, unknown> | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  workspace_id: string
  author_id: string
  content: string
  likes_count: number
  mentions: Array<{ user_id: string; display_name: string }>
  commentable_type: string
  commentable_id: string
  parent_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Reaction {
  id: string
  workspace_id: string
  member_id: string
  emoji: ReactionEmoji
  reactable_type: string
  reactable_id: string
  created_at: string
}

// --- With relations ---

export interface PostWithAuthor extends Post {
  author?: { id: string; display_name: string; avatar_url: string | null; job_title: string | null } | null
  space?: { id: string; name: string; slug: string; color: string } | null
  user_reactions?: ReactionEmoji[]
}

export interface CommentWithAuthor extends Comment {
  author?: { id: string; display_name: string; avatar_url: string | null } | null
}

export interface SpaceWithMeta extends CommunitySpace {
  posts_count?: number
  product?: { name: string; type: string } | null
}

// --- Labels ---

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  general: 'Ogolna',
  product: 'Produktowa',
  cohort: 'Kohortowa',
  topic: 'Tematyczna',
  announcements: 'Ogloszenia',
  qa: 'Pytania i odpowiedzi',
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  discussion: 'Dyskusja',
  question: 'Pytanie',
  announcement: 'Ogloszenie',
  poll: 'Ankieta',
  resource: 'Zasob',
}

export const REACTION_EMOJIS: { emoji: ReactionEmoji; icon: string }[] = [
  { emoji: 'heart', icon: '❤️' },
  { emoji: 'thumbsup', icon: '👍' },
  { emoji: 'fire', icon: '🔥' },
  { emoji: 'clap', icon: '👏' },
  { emoji: 'thinking', icon: '🤔' },
  { emoji: 'rocket', icon: '🚀' },
]
