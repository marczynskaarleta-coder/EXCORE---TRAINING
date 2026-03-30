'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Textarea } from '@/components/shared/ui/textarea'
import { Input } from '@/components/shared/ui/input'
import { createPost } from '@/modules/training/community/actions'
import { Send } from 'lucide-react'

interface PostComposerProps {
  workspaceId: string
  spaceId: string
}

export function PostComposer({ workspaceId, spaceId }: PostComposerProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    formData.set('space_id', spaceId)
    const result = await createPost(workspaceId, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setExpanded(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-card border rounded-lg p-3 text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        Napisz cos do spolecznosci...
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="bg-card border rounded-lg p-4 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Input name="title" placeholder="Tytul (opcjonalnie)" />
      <Textarea name="content" placeholder="Tresc posta..." rows={3} required autoFocus />
      <input type="hidden" name="type" value="discussion" />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(false)}>Anuluj</Button>
        <Button type="submit" size="sm" disabled={loading}>
          <Send className="h-4 w-4 mr-1" />
          {loading ? 'Publikowanie...' : 'Opublikuj'}
        </Button>
      </div>
    </form>
  )
}
