import { Badge } from '@/components/shared/ui/badge'
import type { ProductType } from '@/modules/training/products/types'
import { PRODUCT_TYPE_LABELS } from '@/modules/training/products/types'

export function ProductTypeBadge({ type }: { type: ProductType }) {
  return (
    <Badge variant="outline" className="text-xs">
      {PRODUCT_TYPE_LABELS[type] || type}
    </Badge>
  )
}
