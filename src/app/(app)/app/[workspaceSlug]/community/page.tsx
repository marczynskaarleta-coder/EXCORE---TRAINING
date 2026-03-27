import Link from 'next/link'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/lib/actions/workspace'
import { getSpaces, getFeedPosts } from '@/lib/actions/community'
import { MessageSquare, Hash, Users } from 'lucide-react'

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) return null

  const [spaces, posts] = await Promise.all([
    getSpaces(workspace.id),
    getFeedPosts(workspace.id, 1, 20),
  ])

  return (
    <div className="flex gap-6">
      {/* Sidebar - spaces */}
      <div className="w-64 shrink-0">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Przestrzenie</h2>
          </div>
          <div className="space-y-1">
            {spaces.map((space: {
              id: string; name: string; slug: string; icon: string | null; color: string
            }) => (
              <Link
                key={space.id}
                href={`/app/${workspaceSlug}/community/${space.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
              >
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{space.name}</span>
              </Link>
            ))}
            {spaces.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">Brak przestrzeni</p>
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
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Brak postow</h3>
            <p className="text-muted-foreground">Spolecznosc jest pusta. Napisz pierwszy post!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: {
              id: string
              title: string | null
              content: string
              type: string
              likes_count: number
              comments_count: number
              created_at: string
              author: { display_name: string; avatar_url: string | null } | null
              space: { name: string; color: string } | null
            }) => (
              <div key={post.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {post.author?.display_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{post.author?.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.space?.name} / {new Date(post.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                </div>
                {post.title && <h3 className="font-semibold mb-1">{post.title}</h3>}
                <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{post.likes_count} polubien</span>
                  <span>{post.comments_count} komentarzy</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
