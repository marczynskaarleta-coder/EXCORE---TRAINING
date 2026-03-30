import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getAccessibleSpaces, getFeed } from '@/modules/training/community/actions'
import { getUserPostReactions } from '@/modules/training/community/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { PostCard } from '@/components/training/community/PostCard'
import { Button } from '@/components/shared/ui/button'
import type { ReactionEmoji } from '@/modules/training/community/types'
import { Users, Hash, Plus, Settings } from 'lucide-react'

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')
  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const ctx = await buildAccessContext(workspace.id, member.user_id)
  const canManageSpaces = ctx && hasPermission(ctx, 'community.manage_spaces')

  const [spaces, posts] = await Promise.all([
    getAccessibleSpaces(workspace.id, member.user_id),
    getFeed(workspace.id, member.user_id, 1, 30),
  ])

  // Get user reactions for displayed posts
  const postIds = posts.map(p => p.id)
  const userReactions = await getUserPostReactions(member.id, postIds)
  const reactionsMap = new Map<string, ReactionEmoji[]>()
  for (const r of userReactions) {
    const existing = reactionsMap.get(r.reactable_id) || []
    existing.push(r.emoji as ReactionEmoji)
    reactionsMap.set(r.reactable_id, existing)
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar - spaces */}
      <div className="w-64 shrink-0">
        <div className="bg-card border rounded-lg">
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="font-semibold text-sm">Przestrzenie</h2>
            {canManageSpaces && (
              <Link href={`/app/${workspaceSlug}/community/new-space`}>
                <Button size="icon-xs" variant="ghost"><Plus className="h-3.5 w-3.5" /></Button>
              </Link>
            )}
          </div>
          <div className="p-2 space-y-0.5">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/app/${workspaceSlug}/community/${space.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
              >
                <Hash className="h-3.5 w-3.5" style={{ color: space.color }} />
                <span className="truncate flex-1">{space.name}</span>
                {space.visibility === 'product_access' && (
                  <span className="text-xs text-muted-foreground">premium</span>
                )}
              </Link>
            ))}
            {spaces.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">Brak dostepnych przestrzeni</p>
            )}
          </div>
        </div>
      </div>

      {/* Main feed */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Spolecznosc
          </h1>
        </div>

        {posts.length === 0 ? (
          <div className="bg-card border rounded-lg p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Brak postow</h3>
            <p className="text-muted-foreground">Wybierz przestrzen i napisz pierwszy post!</p>
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
                showSpace
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
