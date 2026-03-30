'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/shared/ui/input'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { ProductStatusBadge } from './ProductStatusBadge'
import { ProductTypeBadge } from './ProductTypeBadge'
import {
  PRODUCT_TYPE_LABELS, PRODUCT_STATUS_LABELS, formatPrice,
} from '@/modules/training/products/types'
import type { ProductStatus, ProductType, ProductWithRelations } from '@/modules/training/products/types'
import { Package, Users, Search, X } from 'lucide-react'

interface Props {
  products: ProductWithRelations[]
  workspaceSlug: string
}

export function ProductListFilters({ products, workspaceSlug }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all')

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [products, search, statusFilter, typeFilter])

  const hasFilters = search || statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj produktu..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'draft', 'published', 'archived'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Wszystkie' : PRODUCT_STATUS_LABELS[s]}
              {s !== 'all' && (
                <span className="ml-1 opacity-70">
                  {products.filter(p => p.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as ProductType | 'all')}
          className="h-8 px-2 rounded-md border bg-background text-sm"
        >
          <option value="all">Wszystkie typy</option>
          {(Object.entries(PRODUCT_TYPE_LABELS) as [ProductType, string][]).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all') }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Wyczysc
          </Button>
        )}
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-xs text-muted-foreground">{filtered.length} z {products.length} produktow</p>
      )}

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="bg-card border rounded-lg p-8 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            {hasFilters ? 'Brak produktow pasujacych do filtrow' : 'Brak produktow'}
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg divide-y">
          {filtered.map((product) => {
            const enrollmentCount = product.enrollments?.[0]?.count || 0
            const activePlan = product.product_plans?.find(p => p.is_active)

            return (
              <Link
                key={product.id}
                href={`/app/${workspaceSlug}/admin/products/${product.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {product.cover_image_url ? (
                    <div
                      className="w-16 h-12 rounded bg-muted bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url(${product.cover_image_url})` }}
                    />
                  ) : (
                    <div className="w-16 h-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-primary/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{product.name}</p>
                      <ProductStatusBadge status={product.status as ProductStatus} />
                      <ProductTypeBadge type={product.type as ProductType} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {enrollmentCount}
                      </span>
                      <span>/{product.slug}</span>
                      {activePlan && (
                        <span>{formatPrice(activePlan.price_amount, activePlan.currency)}</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {product.visibility}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(product.updated_at).toLocaleDateString('pl-PL')}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
