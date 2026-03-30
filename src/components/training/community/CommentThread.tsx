'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar'
import { Button } from '@/components/shared/ui/button'
import { Textarea } from '@/components/shared/ui/textarea'
import { addComment } from '@/modules/training/community/actions'
import type { CommentWithAuthor } from '@/modules/training/community/types'
import { Send } from 'lucide-react'

interface CommentThreadProps {
  postId: string
  workspaceId: string
  comments: CommentWithAuthor[]
  isLocked: boolean
}

export function CommentThread({ postId, workspaceId, comments, isLocked }: CommentThreadProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError(null)

    const result = await addComment(workspaceId, postId, content.trim())
    if (result?.error) {
      setError(result.error)
    } else {
      setContent('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">{comments.length} komentarzy</h3>

      {/* Comment list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar size="sm">
              <AvatarFallback>{comment.author?.display_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.author?.display_name}</span>
                <time className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Brak komentarzy. Bądź pierwszy!</p>
        )}
      </div>

      {/* New comment form */}
      {!isLocked ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Napisz komentarz..."
            rows={1}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={loading || !content.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">Post jest zablokowany - komentowanie wylaczone</p>
      )}
    </div>
  )
}
