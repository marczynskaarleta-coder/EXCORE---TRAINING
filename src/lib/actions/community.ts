'use server'

import { createClient } from '@/lib/supabase/server'

// Spaces
export async function getSpaces(workspaceId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('community_spaces')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .order('position', { ascending: true })

  return data || []
}

export async function createSpace(workspaceId: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const type = formData.get('type') as string || 'general'
  const description = formData.get('description') as string

  const { data, error } = await supabase
    .from('community_spaces')
    .insert({
      workspace_id: workspaceId,
      name,
      slug,
      type,
      description,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

// Posts
export async function getPosts(spaceId: string, page: number = 1, limit: number = 20) {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data } = await supabase
    .from('posts')
    .select(`
      *,
      author:workspace_members!author_id (
        id, display_name, avatar_url, job_title
      )
    `)
    .eq('space_id', spaceId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return data || []
}

export async function getFeedPosts(workspaceId: string, page: number = 1, limit: number = 20) {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data } = await supabase
    .from('posts')
    .select(`
      *,
      author:workspace_members!author_id (
        id, display_name, avatar_url, job_title
      ),
      space:community_spaces!space_id (
        id, name, slug, icon, color
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return data || []
}

export async function createPost(
  spaceId: string,
  workspaceId: string,
  authorId: string,
  formData: FormData
) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const type = formData.get('type') as string || 'discussion'

  const { data, error } = await supabase
    .from('posts')
    .insert({
      space_id: spaceId,
      workspace_id: workspaceId,
      author_id: authorId,
      title,
      content,
      type,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

// Comments
export async function getComments(postId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('comments')
    .select(`
      *,
      author:workspace_members!author_id (
        id, display_name, avatar_url
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  return data || []
}

export async function createComment(
  postId: string,
  workspaceId: string,
  authorId: string,
  content: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      workspace_id: workspaceId,
      author_id: authorId,
      content,
      commentable_type: 'post',
      commentable_id: postId,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Increment comment count
  await supabase.rpc('increment_comments_count', { post_id: postId })

  return { data }
}

// Reactions
export async function toggleReaction(
  workspaceId: string,
  memberId: string,
  targetType: string,
  targetId: string,
  emoji: string
) {
  const supabase = await createClient()

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('member_id', memberId)
    .eq('reactable_type', targetType)
    .eq('reactable_id', targetId)
    .eq('emoji', emoji)
    .single()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
    return { removed: true }
  }

  await supabase.from('reactions').insert({
    workspace_id: workspaceId,
    member_id: memberId,
    reactable_type: targetType,
    reactable_id: targetId,
    emoji,
  })

  return { added: true }
}

// DMs
export async function sendMessage(
  workspaceId: string,
  senderId: string,
  recipientId: string,
  content: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      workspace_id: workspaceId,
      sender_id: senderId,
      recipient_id: recipientId,
      content,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function getConversation(memberId: string, otherMemberId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:workspace_members!sender_id (id, display_name, avatar_url),
      recipient:workspace_members!recipient_id (id, display_name, avatar_url)
    `)
    .or(`and(sender_id.eq.${memberId},recipient_id.eq.${otherMemberId}),and(sender_id.eq.${otherMemberId},recipient_id.eq.${memberId})`)
    .order('created_at', { ascending: true })

  return data || []
}
