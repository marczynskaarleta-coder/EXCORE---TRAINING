import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getProduct } from '@/modules/training/products/actions'
import { getPrograms } from '@/modules/training/learning/actions'
import { getMyEnrollments } from '@/modules/training/enrollments/actions'
import { getLessonProgress } from '@/modules/training/learning/actions'
import { ProductTypeBadge } from '@/components/training/products/ProductTypeBadge'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { Separator } from '@/components/shared/ui/separator'
import type { ProductType } from '@/modules/training/products/types'
import type { LessonType } from '@/modules/training/learning/types'
import { LESSON_TYPE_LABELS } from '@/modules/training/learning/types'
import { CheckoutButton } from '@/components/training/billing/CheckoutButton'
import {
  BookOpen, Users, Clock, CheckCircle2, ChevronRight,
  FileText, Video, Headphones, HelpCircle, ClipboardList,
  Radio, Download, Code, Lock,
} from 'lucide-react'

const LESSON_ICONS: Record<string, typeof FileText> = {
  text: FileText, video: Video, audio: Headphones,
  quiz: HelpCircle, assignment: ClipboardList, live_session: Radio,
  download: Download, embed: Code,
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; productId: string }>
}) {
  const { workspaceSlug, productId } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')

  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const product = await getProduct(productId)
  if (!product) notFound()

  const [programs, enrollments] = await Promise.all([
    getPrograms(productId),
    getMyEnrollments(workspace.id, member.user_id),
  ])

  const enrollment = enrollments.find(e => e.product_id === productId)
  const isEnrolled = !!enrollment
  const enrollmentCount = product.enrollments?.[0]?.count || 0
  const activePlan = product.product_plans?.find(p => p.is_active)

  // Load progress if enrolled
  let progressMap = new Map<string, string>()
  if (enrollment) {
    const progress = await getLessonProgress(enrollment.id)
    progressMap = new Map(progress.map(p => [p.lesson_id, p.status]))
  }

  // Count totals
  let totalLessons = 0
  let totalDuration = 0
  let completedLessons = 0
  for (const prog of programs) {
    for (const mod of prog.program_modules || []) {
      for (const lesson of (mod.lessons || []).filter(l => l.is_published)) {
        totalLessons++
        totalDuration += lesson.duration_minutes || 0
        if (progressMap.get(lesson.id) === 'completed') completedLessons++
      }
    }
  }

  // Find first uncompleted lesson for "continue" button
  let continueLesson: string | null = null
  for (const prog of programs) {
    for (const mod of prog.program_modules || []) {
      for (const lesson of (mod.lessons || []).filter(l => l.is_published)) {
        if (progressMap.get(lesson.id) !== 'completed') {
          continueLesson = lesson.id
          break
        }
      }
      if (continueLesson) break
    }
    if (continueLesson) break
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="flex gap-6">
        {product.cover_image_url ? (
          <div
            className="w-48 h-32 rounded-lg bg-muted bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url(${product.cover_image_url})` }}
          />
        ) : (
          <div className="w-48 h-32 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ProductTypeBadge type={product.type as ProductType} />
            {isEnrolled && (
              <Badge className="text-xs bg-green-100 text-green-700">Zapisany</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {enrollmentCount} uczestnikow
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {totalLessons} lekcji
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {totalDuration} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment bar */}
      {isEnrolled ? (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Twoj postep</p>
              <p className="text-xs text-muted-foreground">{completedLessons}/{totalLessons} lekcji ukonczonych</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${enrollment.progress_percent}%` }}
                />
              </div>
              <span className="text-sm font-bold">{enrollment.progress_percent}%</span>
            </div>
            {continueLesson && (
              <Link href={`/app/${workspaceSlug}/learning/${productId}/${continueLesson}`}>
                <Button size="sm">
                  Kontynuuj nauke
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">
              {activePlan?.billing_type === 'free' || !activePlan
                ? 'Darmowy dostep'
                : `${(activePlan.price_amount / 100).toFixed(0)} ${activePlan.currency}`}
            </p>
            <p className="text-sm text-muted-foreground">Zapisz sie aby uzyskac dostep do tresci</p>
          </div>
          {activePlan && (
            <CheckoutButton
              workspaceId={workspace.id}
              productId={productId}
              planId={activePlan.id}
              billingType={activePlan.billing_type}
              priceAmount={activePlan.price_amount}
              currency={activePlan.currency}
            />
          )}
        </div>
      )}

      <Separator />

      {/* Program structure */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Program kursu</h2>

        {programs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Program nie zostal jeszcze opublikowany</p>
        ) : (
          <div className="space-y-3">
            {programs.map((prog) => (
              <div key={prog.id}>
                {programs.length > 1 && (
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">{prog.name}</h3>
                )}
                <div className="border rounded-lg divide-y">
                  {(prog.program_modules || []).map((mod) => {
                    const lessons = (mod.lessons || []).filter(l => l.is_published)
                    const modCompleted = lessons.filter(l => progressMap.get(l.id) === 'completed').length

                    return (
                      <div key={mod.id}>
                        <div className="px-4 py-3 flex items-center gap-3 bg-muted/30">
                          <span className="font-medium text-sm flex-1">{mod.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {isEnrolled ? `${modCompleted}/${lessons.length}` : `${lessons.length} lekcji`}
                          </span>
                        </div>
                        {lessons.map((lesson) => {
                          const Icon = LESSON_ICONS[lesson.type] || FileText
                          const status = progressMap.get(lesson.id)

                          return (
                            <div key={lesson.id} className="px-4 py-2 flex items-center gap-3">
                              {isEnrolled ? (
                                status === 'completed' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                )
                              ) : (
                                lesson.is_free_preview ? (
                                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <Lock className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                )
                              )}

                              {isEnrolled || lesson.is_free_preview ? (
                                <Link
                                  href={`/app/${workspaceSlug}/learning/${productId}/${lesson.id}`}
                                  className="text-sm flex-1 hover:text-primary transition-colors"
                                >
                                  {lesson.title}
                                </Link>
                              ) : (
                                <span className="text-sm flex-1 text-muted-foreground">{lesson.title}</span>
                              )}

                              <div className="flex items-center gap-2">
                                {lesson.is_free_preview && !isEnrolled && (
                                  <Badge variant="outline" className="text-xs">Preview</Badge>
                                )}
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
