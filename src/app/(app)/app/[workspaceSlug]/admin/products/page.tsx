import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getAdminProducts } from '@/modules/training/products/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { ProductListFilters } from '@/components/training/products/ProductListFilters'
import { Button } from '@/components/shared/ui/button'
import { Plus, Package } from 'lucide-react'

export default async function AdminProductsPage({
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
  if (!ctx || !hasPermission(ctx, 'product.view')) {
    redirect(`/app/${workspaceSlug}/dashboard`)
  }

  const products = await getAdminProducts(workspace.id)
  const canCreate = hasPermission(ctx, 'product.create')

  const drafts = products.filter(p => p.status === 'draft').length
  const published = products.filter(p => p.status === 'published').length
  const archived = products.filter(p => p.status === 'archived').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Produkty
          </h1>
          <p className="text-muted-foreground text-sm">
            {products.length} produktow ({published} opubl. / {drafts} szkicow / {archived} archiw.)
          </p>
        </div>
        {canCreate && (
          <Link href={`/app/${workspaceSlug}/admin/products/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowy produkt
            </Button>
          </Link>
        )}
      </div>

      <ProductListFilters products={products} workspaceSlug={workspaceSlug} />
    </div>
  )
}
