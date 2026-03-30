import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getSpace, getSpacePosts, getUserPostReactions } from '@/modules/training/community/actions'
import { canAccessResource, buildAccessContext, hasPermission } from '@/modules/shared/access'
import { PostCard } from '@/components/training/community/PostCard'
import { PostComposer } from '@/components/training/community/PostComposer'
import { Badge } from '@/components/shared/ui/badge'
import type { ReactionEmoji } from '@/modules/training/community/types'
import { SPACE_TYPE_LABELS } from '@/modules/training/community/types'
import type { SpaceType } from '@/modules/training/community/types'
import { ArrowLeft, Hash, Lock, Globe, Users } from 'lucide-react'

const VISIBILITY_ICONS = { public: Globe, members_only: Users, product_access: Lock, invite_only: Lock }

export default async function SpacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; spaceId: string }>
}) {
  const { workspaceSlug, spaceId } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')
  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const space = await getSpace(spaceId)
  if (!space) notFound()

  // Access check for product-linked spaces
  if (space.visibility === 'product_access' && space.product_id) {
    const access = await canAccessResource(member.user_id, workspace.id, 'product', space.product_id)
    if (!access.granted) {
      return (
        <div className="max-w-lg mx-auto text-center py-16">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Przestrzen premium</h1>
          <p className="text-muted-foreground mb-4">{access.reason}</p>
          <Link href={`/app/${workspaceSlug}/community`} className="text-sm text-primary hover:underline">Powrot do spolecznosci</Link>
        </div>
      )
    }
  }

  const posts = await getSpacePosts(spaceId, 1, 30)
  const ctx = await buildAccessContext(workspace.id, member.user_id)
  const canPost = ctx && hasPermission(ctx, 'community.post')

  // User reactions
  const postIds = posts.map(p => p.id)
  const userReactions = await getUserPostReactions(member.id, postIds)
  const reactionsMap = new Map<string, ReactionEmoji[]>()
  for (const r of userReactions) {
    const existing = reactionsMap.get(r.reactable_id) || []
    existing.push(r.emoji as ReactionEmoji)
    reactionsMap.set(r.reactable_id, existing)
  }

  const VisIcon = VISIBILITY_ICONS[space.visibility as keyof typeof VISIBILITY_ICONS] || Users

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <Link href={`/app/${workspaceSlug}/community`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Spolecznosc
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${space.color}20` }}>
            <Hash className="h-5 w-5" style={{ color: space.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{space.name}</h1>
              <Badge variant="outline" className="text-xs">{SPACE_TYPE_LABELS[space.type as SpaceType]}</Badge>
              <VisIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {space.description && <p className="text-sm text-muted-foreground">{space.description}</p>}
          </div>
        </div>
      </div>

      {/* Composer */}
      {canPost && !space.is_archived && (
        <PostComposer workspaceId={workspace.id} spaceId={space.id} />
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <Hash className="h-10 w-10 text-muted-foreground mx-auto mb-3" style={{ color: space.color }} />
          <p className="text-muted-foreground">Jeszcze nie ma postow w tej przestrzeni</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              workspaceSlug={workspaceSlug}
              workspaceId={workspace.id}
              memberId={member.id}
              userReactions={reactionsMap.get(post.id) || []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
