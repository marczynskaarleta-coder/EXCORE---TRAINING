'use server'

import { revalidatePath } from 'next/cache'
import { requireContext, requirePermission, hasPermission, canAccessResource } from '@/modules/shared/access'
import { createSpaceSchema, createPostSchema, createCommentSchema } from './schemas'
import {
  findMemberIdByUser,
  findSpaces, findSpaceById, insertSpace, updateSpaceById,
  findPostsBySpace, findFeedPosts, findPostById, insertPost, updatePostById, softDeletePost,
  findCommentsByPost, insertComment, softDeleteComment, incrementCommentsCount,
  findUserReactions, findReaction, insertReaction, deleteReaction,
} from './repository'
import type { CommunitySpace } from './types'

// =============================================
// Spaces - access-aware
// =============================================

export async function getAccessibleSpaces(workspaceId: string, userId: string) {
  const allSpaces = await findSpaces(workspaceId)
  const accessible: CommunitySpace[] = []

  for (const space of allSpaces) {
    if (space.visibility === 'public' || space.visibility === 'members_only') {
      accessible.push(space)
      continue
    }
    if (space.visibility === 'product_access' && space.product_id) {
      const access = await canAccessResource(userId, workspaceId, 'product', space.product_id)
      if (access.granted) accessible.push(space)
      continue
    }
    const auth = await requireContext(workspaceId)
    if (!('error' in auth) && hasPermission(auth.ctx, 'community.manage_spaces')) {
      accessible.push(space)
    }
  }
  return accessible
}

export async function getSpaces(workspaceId: string) {
  return findSpaces(workspaceId)
}

export async function getSpace(spaceId: string) {
  return findSpaceById(spaceId)
}

export async function createSpace(workspaceId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'community.manage_spaces')
  if ('error' in auth) return { error: auth.error }

  const parsed = createSpaceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    type: formData.get('type') || 'general',
    visibility: formData.get('visibility') || 'members_only',
    product_id: formData.get('product_id') || null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')
  const { data, error } = await insertSpace({
    workspace_id: workspaceId,
    name: parsed.data.name,
    type: parsed.data.type,
    visibility: parsed.data.visibility,
    description: parsed.data.description || null,
    product_id: parsed.data.product_id || null,
    slug,
    created_by: auth.user.id,
  })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

export async function archiveSpace(workspaceId: string, spaceId: string) {
  const auth = await requirePermission(workspaceId, 'community.manage_spaces')
  if ('error' in auth) return { error: auth.error }
  await updateSpaceById(spaceId, { is_archived: true })
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Posts
// =============================================

export async function getSpacePosts(spaceId: string, page = 1, limit = 20) {
  return findPostsBySpace(spaceId, (page - 1) * limit, limit)
}

export async function getFeed(workspaceId: string, userId: string, page = 1, limit = 20) {
  const spaces = await getAccessibleSpaces(workspaceId, userId)
  return findFeedPosts(workspaceId, spaces.map(s => s.id), (page - 1) * limit, limit)
}

export async function getFeedPosts(workspaceId: string, page = 1, limit = 20) {
  return findFeedPosts(workspaceId, [], (page - 1) * limit, limit)
}

export async function getPost(postId: string) {
  return findPostById(postId)
}

export async function createPost(workspaceId: string, formData: FormData) {
  const auth = await requirePermission(workspaceId, 'community.post')
  if ('error' in auth) return { error: auth.error }

  const memberId = await findMemberIdByUser(workspaceId, auth.user.id)
  if (!memberId) return { error: 'Brak czlonkostwa' }

  const parsed = createPostSchema.safeParse({
    space_id: formData.get('space_id'),
    title: formData.get('title') || undefined,
    content: formData.get('content'),
    type: formData.get('type') || 'discussion',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await insertPost({
    space_id: parsed.data.space_id,
    workspace_id: workspaceId,
    author_id: memberId,
    type: parsed.data.type,
    title: parsed.data.title || null,
    content: parsed.data.content,
  })
  if (error) return { error: error.message }
  revalidatePath('/app')
  return { data }
}

export async function pinPost(workspaceId: string, postId: string, pinned: boolean) {
  const auth = await requirePermission(workspaceId, 'community.moderate')
  if ('error' in auth) return { error: auth.error }
  await updatePostById(postId, { is_pinned: pinned })
  revalidatePath('/app')
  return { success: true }
}

export async function lockPost(workspaceId: string, postId: string, locked: boolean) {
  const auth = await requirePermission(workspaceId, 'community.moderate')
  if ('error' in auth) return { error: auth.error }
  await updatePostById(postId, { is_locked: locked })
  revalidatePath('/app')
  return { success: true }
}

export async function removePost(workspaceId: string, postId: string) {
  const auth = await requirePermission(workspaceId, 'community.moderate')
  if ('error' in auth) return { error: auth.error }
  await softDeletePost(postId)
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Comments
// =============================================

export async function getComments(postId: string) {
  return findCommentsByPost(postId)
}

export async function addComment(workspaceId: string, postId: string, content: string) {
  const auth = await requirePermission(workspaceId, 'community.post')
  if ('error' in auth) return { error: auth.error }

  const memberId = await findMemberIdByUser(workspaceId, auth.user.id)
  if (!memberId) return { error: 'Brak czlonkostwa' }

  const parsed = createCommentSchema.safeParse({ post_id: postId, content })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await insertComment({
    workspace_id: workspaceId, author_id: memberId, content,
    commentable_type: 'post', commentable_id: postId,
  })
  if (error) return { error: error.message }
  await incrementCommentsCount(postId)
  revalidatePath('/app')
  return { data }
}

export async function removeComment(workspaceId: string, commentId: string) {
  const auth = await requirePermission(workspaceId, 'community.moderate')
  if ('error' in auth) return { error: auth.error }
  await softDeleteComment(commentId)
  revalidatePath('/app')
  return { success: true }
}

// =============================================
// Reactions
// =============================================

export async function getUserPostReactions(memberId: string, postIds: string[]) {
  return findUserReactions(memberId, 'post', postIds)
}

export async function toggleReaction(
  workspaceId: string, memberId: string,
  targetType: string, targetId: string, emoji: string
) {
  const existing = await findReaction(memberId, targetType, targetId, emoji)
  if (existing) {
    await deleteReaction(existing.id)
    if (targetType === 'post') {
      const post = await findPostById(targetId)
      if (post) await updatePostById(targetId, { likes_count: Math.max(0, (post.likes_count || 0) - 1) })
    }
    revalidatePath('/app')
    return { removed: true }
  }

  await insertReaction({ workspace_id: workspaceId, member_id: memberId, reactable_type: targetType, reactable_id: targetId, emoji })
  if (targetType === 'post') {
    const post = await findPostById(targetId)
    if (post) await updatePostById(targetId, { likes_count: (post.likes_count || 0) + 1 })
  }
  revalidatePath('/app')
  return { added: true }
}
