import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getProduct, updateProduct } from '@/modules/training/products/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { ProductForm } from '@/components/training/products/ProductForm'
import { ProductActions } from '@/components/training/products/ProductActions'
import { ProductStatusBadge } from '@/components/training/products/ProductStatusBadge'
import { ProductTypeBadge } from '@/components/training/products/ProductTypeBadge'
import { PlanList } from '@/components/training/products/PlanList'
import { ProgramEditor } from '@/components/training/learning/ProgramEditor'
import { getPrograms } from '@/modules/training/learning/actions'
import { Badge } from '@/components/shared/ui/badge'
import { Separator } from '@/components/shared/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs'
import { PRODUCT_VISIBILITY_LABELS, formatPrice } from '@/modules/training/products/types'
import type { ProductStatus, ProductType, ProductVisibility } from '@/modules/training/products/types'
import { ArrowLeft, Users, CreditCard, BookOpen, Globe, Lock, Eye } from 'lucide-react'

const VISIBILITY_ICONS = { public: Globe, members: Eye, private: Lock }

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; productId: string }>
}) {
  const { workspaceSlug, productId } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')

  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const ctx = await buildAccessContext(workspace.id, member.user_id)
  if (!ctx || !hasPermission(ctx, 'product.view')) {
    redirect(`/app/${workspaceSlug}/dashboard`)
  }

  const product = await getProduct(productId)
  if (!product) notFound()

  const canEdit = hasPermission(ctx, 'product.edit')
  const canPublish = hasPermission(ctx, 'product.publish')
  const canDelete = hasPermission(ctx, 'product.delete')

  const enrollmentCount = product.enrollments?.[0]?.count || 0
  const plans = product.product_plans || []
  const activePlans = plans.filter(p => p.is_active)
  const programs = product.programs || []
  const fullPrograms = await getPrograms(product.id)

  const VisIcon = VISIBILITY_ICONS[product.visibility as keyof typeof VISIBILITY_ICONS] || Eye

  // Total lessons across all programs
  let totalLessons = 0
  for (const prog of fullPrograms) {
    for (const mod of prog.program_modules || []) {
      totalLessons += (mod.lessons?.length || 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/app/${workspaceSlug}/admin/products`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Powrot do listy
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <ProductStatusBadge status={product.status as ProductStatus} />
              <ProductTypeBadge type={product.type as ProductType} />
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <VisIcon className="h-3 w-3" />
                {PRODUCT_VISIBILITY_LABELS[product.visibility as ProductVisibility]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              /{product.slug}
              {product.description && (
                <span className="ml-2">-</span>
              )}
              {product.description && (
                <span className="ml-2">{product.description.slice(0, 80)}{product.description.length > 80 ? '...' : ''}</span>
              )}
            </p>
          </div>

          <ProductActions
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
            productId={product.id}
            status={product.status}
            canPublish={canPublish}
            canDelete={canDelete}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Zapisanych</span>
          </div>
          <p className="text-xl font-bold">{enrollmentCount}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Planow</span>
          </div>
          <p className="text-xl font-bold">{activePlans.length}<span className="text-sm text-muted-foreground font-normal">/{plans.length}</span></p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Programy</span>
          </div>
          <p className="text-xl font-bold">{programs.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Lekcji</span>
          </div>
          <p className="text-xl font-bold">{totalLessons}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cena</span>
          </div>
          <p className="text-sm font-bold">
            {activePlans.length === 0
              ? 'Brak planu'
              : activePlans.map(p => formatPrice(p.price_amount, p.currency)).join(' / ')}
          </p>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Szczegoly</TabsTrigger>
          <TabsTrigger value="plans">Plany ({plans.length})</TabsTrigger>
          <TabsTrigger value="programs">Programy ({programs.length})</TabsTrigger>
          <TabsTrigger value="enrollments">Zapisani ({enrollmentCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          {canEdit ? (
            <ProductForm
              workspaceSlug={workspaceSlug}
              workspaceId={workspace.id}
              product={product}
              action={async () => ({ success: true })}
              actionWithProduct={updateProduct}
            />
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div>
                <p className="text-sm text-muted-foreground">Nazwa</p>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Slug</p>
                <p className="font-mono text-sm">/{product.slug}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opis</p>
                <p className="whitespace-pre-wrap">{product.description || 'Brak opisu'}</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <PlanList
            workspaceId={workspace.id}
            productId={product.id}
            plans={plans.map(p => ({
              id: p.id,
              name: p.name,
              billing_type: p.billing_type,
              price_amount: p.price_amount,
              currency: p.currency,
              interval: p.interval || null,
              trial_days: p.trial_days || 0,
              is_active: p.is_active,
              position: p.position || 0,
              metadata: p.metadata || {},
              created_at: p.created_at || '',
            }))}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="programs" className="mt-6">
          <ProgramEditor
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
            productId={product.id}
            programs={fullPrograms}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6">
          <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{enrollmentCount} zapisanych uczestnikow</p>
            <p className="text-xs text-muted-foreground mt-1">Szczegolowe zarzadzanie zapisami w kolejnym sprincie</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
