import { redirect, notFound } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getProduct } from '@/modules/training/products/actions'
import { getPrograms, getLessonWithContext, getLessonProgress } from '@/modules/training/learning/actions'
import { getMyEnrollments } from '@/modules/training/enrollments/actions'
import { canAccessResource } from '@/modules/shared/access'
import { ProgramSidebar } from '@/components/training/learning/ProgramSidebar'
import { LessonView } from '@/components/training/learning/LessonView'
import type { LessonProgress, ProgramWithModules } from '@/modules/training/learning/types'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; productId: string; lessonId: string }>
}) {
  const { workspaceSlug, productId, lessonId } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')

  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  // Check access through access engine
  const access = await canAccessResource(member.user_id, workspace.id, 'lesson', lessonId)

  // Get lesson context
  const lessonCtx = await getLessonWithContext(lessonId)
  if (!lessonCtx) notFound()

  const { lesson, module: mod, program } = lessonCtx

  // Access denied view
  if (!access.granted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Brak dostepu</h1>
        <p className="text-muted-foreground mb-4">{access.reason}</p>
        <Link href={`/app/${workspaceSlug}/learning/${productId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrot do kursu
          </Button>
        </Link>
      </div>
    )
  }

  // Get enrollment and progress
  const enrollments = await getMyEnrollments(workspace.id, member.user_id)
  const enrollment = enrollments.find(e => e.product_id === productId)

  let progressMap = new Map<string, LessonProgress>()
  let currentProgress: LessonProgress | null = null

  if (enrollment) {
    const allProgress = await getLessonProgress(enrollment.id)
    progressMap = new Map(allProgress.map(p => [p.lesson_id, p]))
    currentProgress = progressMap.get(lessonId) || null
  }

  // Get full program for sidebar
  const programs = await getPrograms(productId)
  const currentProgram = programs.find(p => p.id === program?.id) || programs[0]

  return (
    <div className="flex gap-6 -m-6">
      {/* Sidebar */}
      {currentProgram && enrollment && (
        <div className="p-6 pr-0">
          <ProgramSidebar
            workspaceSlug={workspaceSlug}
            productId={productId}
            program={currentProgram}
            progress={progressMap}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
          <Link href={`/app/${workspaceSlug}/learning/${productId}`} className="hover:text-foreground">
            Kurs
          </Link>
          <span>/</span>
          <span>{mod?.title}</span>
          <span>/</span>
          <span className="text-foreground">{lesson.title}</span>
        </div>

        <LessonView
          lesson={lesson}
          progress={currentProgress}
          enrollmentId={enrollment?.id || ''}
          userId={member.user_id}
          workspaceId={workspace.id}
        />
      </div>
    </div>
  )
}
