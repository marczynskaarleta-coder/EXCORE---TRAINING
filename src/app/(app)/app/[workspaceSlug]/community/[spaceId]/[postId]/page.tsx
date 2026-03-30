import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getPost, getComments, getUserPostReactions } from '@/modules/training/community/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { PostCard } from '@/components/training/community/PostCard'
import { CommentThread } from '@/components/training/community/CommentThread'
import { Separator } from '@/components/shared/ui/separator'
import { Button } from '@/components/shared/ui/button'
import { pinPost, lockPost, removePost } from '@/modules/training/community/actions'
import type { ReactionEmoji, CommentWithAuthor } from '@/modules/training/community/types'
import { ArrowLeft, Pin, Lock, Trash2 } from 'lucide-react'

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; spaceId: string; postId: string }>
}) {
  const { workspaceSlug, spaceId, postId } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')
  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const [post, comments] = await Promise.all([
    getPost(postId),
    getComments(postId),
  ])
  if (!post) notFound()

  const ctx = await buildAccessContext(workspace.id, member.user_id)
  const canModerate = ctx && hasPermission(ctx, 'community.moderate')

  // User reactions
  const userReactions = await getUserPostReactions(member.id, [post.id])
  const myReactions = userReactions.filter(r => r.reactable_id === post.id).map(r => r.emoji as ReactionEmoji)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href={`/app/${workspaceSlug}/community/${spaceId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Powrot do przestrzeni
      </Link>

      <PostCard
        post={post}
        workspaceSlug={workspaceSlug}
        workspaceId={workspace.id}
        memberId={member.id}
        userReactions={myReactions}
        showSpace
      />

      {/* Moderation actions */}
      {canModerate && (
        <div className="flex items-center gap-2">
          <form action={async () => { 'use server'; await pinPost(workspace.id, postId, !post.is_pinned) }}>
            <Button variant="outline" size="sm" type="submit">
              <Pin className="h-3.5 w-3.5 mr-1" />
              {post.is_pinned ? 'Odepnij' : 'Przypnij'}
            </Button>
          </form>
          <form action={async () => { 'use server'; await lockPost(workspace.id, postId, !post.is_locked) }}>
            <Button variant="outline" size="sm" type="submit">
              <Lock className="h-3.5 w-3.5 mr-1" />
              {post.is_locked ? 'Odblokuj' : 'Zablokuj'}
            </Button>
          </form>
          <form action={async () => { 'use server'; await removePost(workspace.id, postId) }}>
            <Button variant="destructive" size="sm" type="submit">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Usun
            </Button>
          </form>
        </div>
      )}

      <Separator />

      <CommentThread
        postId={post.id}
        workspaceId={workspace.id}
        comments={comments as CommentWithAuthor[]}
        isLocked={post.is_locked}
      />
    </div>
  )
}
