import { createClient } from '@/lib/shared/supabase/server'
import type { CommunitySpace, PostWithAuthor, CommentWithAuthor } from './types'

// =============================================
// Member lookup
// =============================================

export async function findMemberIdByUser(workspaceId: string, userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()
  return data?.id || null
}

// =============================================
// Spaces
// =============================================

export async function findSpaces(workspaceId: string): Promise<CommunitySpace[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('community_spaces')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .order('position', { ascending: true })
  return (data as CommunitySpace[]) || []
}

export async function findSpaceById(spaceId: string): Promise<CommunitySpace | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('community_spaces')
    .select('*')
    .eq('id', spaceId)
    .single()
  return data as CommunitySpace | null
}

export async function insertSpace(input: {
  workspace_id: string
  name: string
  slug: string
  type: string
  visibility: string
  description: string | null
  product_id?: string | null
  created_by?: string
}) {
  const supabase = await createClient()
  return supabase.from('community_spaces').insert(input).select().single()
}

export async function updateSpaceById(spaceId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('community_spaces').update(updates).eq('id', spaceId)
}

// =============================================
// Posts
// =============================================

export async function findPostsBySpace(spaceId: string, offset = 0, limit = 20): Promise<PostWithAuthor[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(`*, author:workspace_members!author_id (id, display_name, avatar_url, job_title)`)
    .eq('space_id', spaceId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return (data as PostWithAuthor[]) || []
}

export async function findFeedPosts(
  workspaceId: string,
  spaceIds: string[],
  offset = 0,
  limit = 20
): Promise<PostWithAuthor[]> {
  const supabase = await createClient()
  let query = supabase
    .from('posts')
    .select(`
      *, author:workspace_members!author_id (id, display_name, avatar_url, job_title),
      space:community_spaces!space_id (id, name, slug, color)
    `)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (spaceIds.length > 0) query = query.in('space_id', spaceIds)
  const { data } = await query
  return (data as PostWithAuthor[]) || []
}

export async function findPostById(postId: string): Promise<PostWithAuthor | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(`
      *, author:workspace_members!author_id (id, display_name, avatar_url, job_title),
      space:community_spaces!space_id (id, name, slug, color)
    `)
    .eq('id', postId)
    .is('deleted_at', null)
    .single()
  return data as PostWithAuthor | null
}

export async function insertPost(input: {
  space_id: string
  workspace_id: string
  author_id: string
  type: string
  title: string | null
  content: string
}) {
  const supabase = await createClient()
  return supabase.from('posts').insert(input).select().single()
}

export async function updatePostById(postId: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  return supabase.from('posts').update(updates).eq('id', postId)
}

export async function softDeletePost(postId: string) {
  const supabase = await createClient()
  return supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId)
}

// =============================================
// Comments
// =============================================

export async function findCommentsByPost(postId: string): Promise<CommentWithAuthor[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('comments')
    .select(`*, author:workspace_members!author_id (id, display_name, avatar_url)`)
    .eq('commentable_type', 'post')
    .eq('commentable_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  return (data as CommentWithAuthor[]) || []
}

export async function insertComment(input: {
  workspace_id: string
  author_id: string
  content: string
  commentable_type: string
  commentable_id: string
  parent_id?: string | null
}) {
  const supabase = await createClient()
  return supabase.from('comments').insert(input).select().single()
}

export async function softDeleteComment(commentId: string) {
  const supabase = await createClient()
  return supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId)
}

export async function incrementCommentsCount(postId: string) {
  const supabase = await createClient()
  await supabase.rpc('increment_comments_count', { target_post_id: postId })
}

// =============================================
// Reactions
// =============================================

export async function findUserReactions(memberId: string, targetType: string, targetIds: string[]) {
  if (targetIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('reactions')
    .select('reactable_id, emoji')
    .eq('member_id', memberId)
    .eq('reactable_type', targetType)
    .in('reactable_id', targetIds)
  return data || []
}

export async function findReaction(memberId: string, targetType: string, targetId: string, emoji: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reactions')
    .select('id')
    .eq('member_id', memberId)
    .eq('reactable_type', targetType)
    .eq('reactable_id', targetId)
    .eq('emoji', emoji)
    .single()
  return data
}

export async function insertReaction(input: {
  workspace_id: string
  member_id: string
  reactable_type: string
  reactable_id: string
  emoji: string
}) {
  const supabase = await createClient()
  return supabase.from('reactions').insert(input)
}

export async function deleteReaction(reactionId: string) {
  const supabase = await createClient()
  return supabase.from('reactions').delete().eq('id', reactionId)
}
