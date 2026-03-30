'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Separator } from '@/components/shared/ui/separator'
import { markLessonComplete, recordLessonView } from '@/modules/training/learning/actions'
import { LESSON_TYPE_LABELS } from '@/modules/training/learning/types'
import type { Lesson, LessonProgress, LessonType } from '@/modules/training/learning/types'
import { CheckCircle2, Video, FileText, Play, ExternalLink } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  lesson: Lesson
  progress: LessonProgress | null
  enrollmentId: string
  userId: string
  workspaceId: string
}

export function LessonView({ lesson, progress, enrollmentId, userId, workspaceId }: Props) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const isCompleted = progress?.status === 'completed'

  // Record view on mount
  useEffect(() => {
    recordLessonView(enrollmentId, lesson.id, userId, workspaceId)
  }, [enrollmentId, lesson.id, userId, workspaceId])

  async function handleComplete() {
    setCompleting(true)
    const result = await markLessonComplete(enrollmentId, lesson.id, userId, workspaceId)
    if (result?.error) alert(result.error)
    else router.refresh()
    setCompleting(false)
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Lesson header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {LESSON_TYPE_LABELS[lesson.type as LessonType] || lesson.type}
          </Badge>
          {lesson.duration_minutes && (
            <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
          )}
          {isCompleted && (
            <Badge className="text-xs bg-green-100 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ukonczona
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </div>

      {/* Video */}
      {lesson.video_url && (
        <div className="mb-6">
          {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={lesson.video_url.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : lesson.video_url.includes('vimeo.com') ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={lesson.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={lesson.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Play className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Otworz wideo</p>
                <p className="text-sm text-muted-foreground">{lesson.video_url}</p>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </a>
          )}
        </div>
      )}

      {/* Audio */}
      {lesson.audio_url && (
        <div className="mb-6">
          <audio controls className="w-full">
            <source src={lesson.audio_url} />
          </audio>
        </div>
      )}

      {/* Text content */}
      {lesson.content && (
        <div
          className="prose prose-sm max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      )}

      {/* Assignment */}
      {lesson.type === 'assignment' && lesson.assignment_instructions && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">Zadanie</h3>
          <div className="text-sm text-amber-900" dangerouslySetInnerHTML={{ __html: lesson.assignment_instructions }} />
        </div>
      )}

      {/* Attachment */}
      {lesson.attachment_url && (
        <a
          href={lesson.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors mb-6"
        >
          <FileText className="h-4 w-4" />
          <span className="text-sm">Pobierz zalacznik</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {/* No content fallback */}
      {!lesson.content && !lesson.video_url && !lesson.audio_url && !lesson.attachment_url && (
        <div className="bg-muted/30 rounded-lg p-8 text-center text-muted-foreground mb-6">
          <FileText className="h-10 w-10 mx-auto mb-2" />
          <p>Tresc lekcji nie zostala jeszcze dodana</p>
        </div>
      )}

      <Separator className="my-6" />

      {/* Complete button */}
      <div className="flex items-center justify-between">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Lekcja ukonczona</span>
            {progress?.completed_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(progress.completed_at).toLocaleDateString('pl-PL')}
              </span>
            )}
          </div>
        ) : (
          <Button onClick={handleComplete} disabled={completing}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completing ? 'Oznaczanie...' : 'Oznacz jako ukonczona'}
          </Button>
        )}
      </div>
    </div>
  )
}
