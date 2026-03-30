import Link from 'next/link'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getProducts } from '@/modules/training/products/actions'
import { getMyEnrollments } from '@/modules/training/enrollments/actions'
import { BookOpen, Clock, Users, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/shared/ui/badge'
import type { ProductWithRelations } from '@/modules/training/products/types'
import { PRODUCT_TYPE_LABELS } from '@/modules/training/products/types'
import type { EnrollmentWithProduct } from '@/modules/training/enrollments/types'

export default async function LearningPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) return null

  const member = await getWorkspaceMember(workspace.id)
  if (!member) return null

  const [products, enrollments] = await Promise.all([
    getProducts(workspace.id),
    getMyEnrollments(workspace.id, member.user_id),
  ])

  const enrolledIds = new Set(enrollments.map((e) => e.product_id))

  const publishedProducts = products.filter(
    (p) => p.status === 'published'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Nauka
        </h1>
        <p className="text-muted-foreground">Przegladaj dostepne produkty edukacyjne</p>
      </div>

      {publishedProducts.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">Brak produktow</h3>
          <p className="text-muted-foreground">Nie ma jeszcze dostepnych kursow ani programow.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publishedProducts.map((product) => {
            const isEnrolled = enrolledIds.has(product.id)
            const enrollmentCount = product.enrollments?.[0]?.count || 0

            return (
              <Link
                key={product.id}
                href={`/app/${workspaceSlug}/learning/${product.id}`}
                className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
              >
                {product.cover_image_url ? (
                  <div className="h-40 bg-muted" style={{
                    backgroundImage: `url(${product.cover_image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary/40" />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {PRODUCT_TYPE_LABELS[product.type] || product.type}
                    </Badge>
                    {isEnrolled && (
                      <Badge className="text-xs bg-green-100 text-green-700">
                        Zapisany
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {enrollmentCount} uczestnikow
                    </span>
                    {(() => {
                      const plan = product.product_plans?.[0]
                      if (!plan || plan.billing_type === 'free') {
                        return <span className="font-medium text-green-600">Darmowe</span>
                      }
                      return (
                        <span className="font-medium">
                          {(plan.price_amount / 100).toFixed(0)} {plan.currency}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
