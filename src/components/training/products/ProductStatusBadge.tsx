import { Badge } from '@/components/shared/ui/badge'
import type { ProductStatus } from '@/modules/training/products/types'

const STATUS_CONFIG: Record<ProductStatus, { label: string; className: string }> = {
  draft: { label: 'Szkic', className: 'bg-gray-100 text-gray-700' },
  published: { label: 'Opublikowany', className: 'bg-green-100 text-green-700' },
  archived: { label: 'Zarchiwizowany', className: 'bg-amber-100 text-amber-700' },
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return <Badge className={config.className}>{config.label}</Badge>
}
