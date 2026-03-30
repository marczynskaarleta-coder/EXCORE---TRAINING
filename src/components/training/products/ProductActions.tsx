'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import {
  publishProduct,
  archiveProduct,
  unarchiveProduct,
  deleteProduct,
} from '@/modules/training/products/actions'
import { Globe, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

interface ProductActionsProps {
  workspaceId: string
  workspaceSlug: string
  productId: string
  status: string
  canPublish: boolean
  canDelete: boolean
}

export function ProductActions({
  workspaceId,
  workspaceSlug,
  productId,
  status,
  canPublish,
  canDelete,
}: ProductActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(
    actionName: string,
    fn: (wsId: string, prodId: string) => Promise<{ error?: string; success?: boolean }>
  ) {
    setLoading(actionName)
    const result = await fn(workspaceId, productId)
    if (result?.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' && canPublish && (
        <Button
          size="sm"
          onClick={() => handleAction('publish', publishProduct)}
          disabled={loading !== null}
        >
          <Globe className="h-4 w-4 mr-1" />
          {loading === 'publish' ? 'Publikowanie...' : 'Opublikuj'}
        </Button>
      )}

      {status === 'published' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('archive', archiveProduct)}
          disabled={loading !== null}
        >
          <Archive className="h-4 w-4 mr-1" />
          {loading === 'archive' ? 'Archiwizowanie...' : 'Archiwizuj'}
        </Button>
      )}

      {status === 'archived' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('unarchive', unarchiveProduct)}
          disabled={loading !== null}
        >
          <ArchiveRestore className="h-4 w-4 mr-1" />
          {loading === 'unarchive' ? 'Przywracanie...' : 'Przywroc do szkicu'}
        </Button>
      )}

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm('Na pewno chcesz usunac ten produkt?')) {
              handleAction('delete', deleteProduct).then(() => {
                router.push(`/app/${workspaceSlug}/admin/products`)
              })
            }
          }}
          disabled={loading !== null}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {loading === 'delete' ? 'Usuwanie...' : 'Usun'}
        </Button>
      )}
    </div>
  )
}
