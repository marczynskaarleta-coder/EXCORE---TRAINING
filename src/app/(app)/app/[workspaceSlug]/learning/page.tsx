import Link from 'next/link'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/lib/actions/workspace'
import { getProducts, getMyEnrollments } from '@/lib/actions/products'
import { BookOpen, Clock, Users, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TYPE_LABELS: Record<string, string> = {
  course: 'Kurs',
  membership: 'Membership',
  cohort_program: 'Program kohortowy',
  event_series: 'Seria wydarzen',
  resource_hub: 'Baza zasobow',
  mentoring_program: 'Mentoring',
  community_access: 'Dostep do spolecznosci',
  bundle: 'Pakiet',
}

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
    getMyEnrollments(workspace.id, member.id),
  ])

  const enrolledIds = new Set(enrollments.map((e: { product_id: string }) => e.product_id))

  const publishedProducts = products.filter(
    (p: { status: string }) => p.status === 'published'
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
          {publishedProducts.map((product: {
            id: string
            title: string
            slug: string
            short_description: string | null
            description: string | null
            type: string
            cover_image_url: string | null
            pricing_type: string
            price_amount: number
            currency: string
            enrollments: { count: number }[] | null
          }) => {
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
                      {TYPE_LABELS[product.type] || product.type}
                    </Badge>
                    {isEnrolled && (
                      <Badge className="text-xs bg-green-100 text-green-700">
                        Zapisany
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.short_description || product.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {enrollmentCount} uczestnikow
                    </span>
                    {product.pricing_type === 'free' ? (
                      <span className="font-medium text-green-600">Darmowe</span>
                    ) : (
                      <span className="font-medium">
                        {(product.price_amount / 100).toFixed(0)} {product.currency}
                      </span>
                    )}
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
