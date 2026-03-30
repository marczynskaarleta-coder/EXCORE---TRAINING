import { redirect } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { createProduct } from '@/modules/training/products/actions'
import { ProductForm } from '@/components/training/products/ProductForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewProductPage({
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
  if (!ctx || !hasPermission(ctx, 'product.create')) {
    redirect(`/app/${workspaceSlug}/admin/products`)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/${workspaceSlug}/admin/products`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Powrot do listy
        </Link>
        <h1 className="text-2xl font-bold">Nowy produkt</h1>
        <p className="text-muted-foreground">Wybierz typ i wypelnij podstawowe informacje</p>
      </div>

      <ProductForm
        workspaceSlug={workspaceSlug}
        workspaceId={workspace.id}
        action={createProduct}
      />
    </div>
  )
}
