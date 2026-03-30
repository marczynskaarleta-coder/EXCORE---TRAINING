'use client'

import Link from 'next/link'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar'
import { REACTION_EMOJIS } from '@/modules/training/community/types'
import type { PostWithAuthor, ReactionEmoji } from '@/modules/training/community/types'
import { Pin, Lock, MessageSquare } from 'lucide-react'
import { toggleReaction } from '@/modules/training/community/actions'
import { useRouter } from 'next/navigation'

interface PostCardProps {
  post: PostWithAuthor
  workspaceSlug: string
  workspaceId: string
  memberId: string
  userReactions?: ReactionEmoji[]
  showSpace?: boolean
}

export function PostCard({ post, workspaceSlug, workspaceId, memberId, userReactions = [], showSpace = false }: PostCardProps) {
  const router = useRouter()
  const base = `/app/${workspaceSlug}/community`
  const postUrl = `${base}/${post.space_id}/${post.id}`

  async function handleReaction(emoji: string) {
    await toggleReaction(workspaceId, memberId, 'post', post.id, emoji)
    router.refresh()
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar size="sm">
          <AvatarFallback>{post.author?.display_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{post.author?.display_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showSpace && post.space && (
              <>
                <Link href={`${base}/${post.space_id}`} className="hover:text-foreground" style={{ color: post.space.color }}>
                  #{post.space.name}
                </Link>
                <span>/</span>
              </>
            )}
            <time>{new Date(post.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {post.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
          {post.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          {post.type !== 'discussion' && (
            <Badge variant="outline" className="text-xs">{post.type}</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <Link href={postUrl} className="block group">
        {post.title && <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{post.title}</h3>}
        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{post.content}</p>
      </Link>

      {/* Footer: reactions + comments */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="flex items-center gap-1">
          {REACTION_EMOJIS.map(({ emoji, icon }) => {
            const isActive = userReactions.includes(emoji)
            return (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`text-sm px-1.5 py-0.5 rounded-md transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                {icon}
              </button>
            )
          })}
          {post.likes_count > 0 && (
            <span className="text-xs text-muted-foreground ml-1">{post.likes_count}</span>
          )}
        </div>
        <Link href={postUrl} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <MessageSquare className="h-3.5 w-3.5" />
          {post.comments_count} komentarzy
        </Link>
      </div>
    </div>
  )
}
