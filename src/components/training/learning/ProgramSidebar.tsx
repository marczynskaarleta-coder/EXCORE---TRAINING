'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/shared/utils'
import type { ProgramWithModules, LessonProgress } from '@/modules/training/learning/types'
import {
  ChevronDown, ChevronRight,
  FileText, Video, Headphones, HelpCircle, ClipboardList,
  Radio, Download, Code, CheckCircle2, Circle, PlayCircle,
} from 'lucide-react'
import { useState } from 'react'

const LESSON_ICONS: Record<string, typeof FileText> = {
  text: FileText, video: Video, audio: Headphones,
  quiz: HelpCircle, assignment: ClipboardList, live_session: Radio,
  download: Download, embed: Code,
}

const STATUS_ICONS = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  not_started: Circle,
}

interface Props {
  workspaceSlug: string
  productId: string
  program: ProgramWithModules
  progress: Map<string, LessonProgress>
}

export function ProgramSidebar({ workspaceSlug, productId, program, progress }: Props) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(program.program_modules?.map(m => m.id) || [])
  )

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const modules = program.program_modules || []
  const base = `/app/${workspaceSlug}/learning/${productId}`

  return (
    <nav className="w-72 shrink-0 bg-card border rounded-lg overflow-hidden">
      <div className="p-3 border-b">
        <p className="font-semibold text-sm truncate">{program.name}</p>
        {(() => {
          const total = modules.reduce((s, m) => s + (m.lessons?.filter(l => l.is_published).length || 0), 0)
          const done = Array.from(progress.values()).filter(p => p.status === 'completed').length
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{done}/{total} lekcji</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })()}
      </div>

      <div className="divide-y max-h-[calc(100vh-14rem)] overflow-y-auto">
        {modules.map((mod) => {
          const lessons = (mod.lessons || []).filter(l => l.is_published)
          const isOpen = expanded.has(mod.id)

          return (
            <div key={mod.id}>
              <button
                onClick={() => toggle(mod.id)}
                className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors"
              >
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="text-sm font-medium flex-1 truncate">{mod.title}</span>
                <span className="text-xs text-muted-foreground">{lessons.length}</span>
              </button>

              {isOpen && lessons.map((lesson) => {
                const lessonProgress = progress.get(lesson.id)
                const status = lessonProgress?.status || 'not_started'
                const LessonIcon = LESSON_ICONS[lesson.type] || FileText
                const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Circle
                const href = `${base}/${lesson.id}`
                const isActive = pathname === href

                return (
                  <Link
                    key={lesson.id}
                    href={href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 pl-8 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    )}
                  >
                    <StatusIcon className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      status === 'completed' && 'text-green-500',
                      status === 'in_progress' && 'text-amber-500',
                    )} />
                    <LessonIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lesson.title}</span>
                    {lesson.duration_minutes && (
                      <span className="text-xs ml-auto shrink-0">{lesson.duration_minutes}m</span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
