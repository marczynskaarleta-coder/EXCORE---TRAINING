'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Badge } from '@/components/shared/ui/badge'
import { Separator } from '@/components/shared/ui/separator'
import {
  createProgram,
  addModule,
  addLesson,
  removeModule,
  removeLesson,
} from '@/modules/training/learning/actions'
import { LESSON_TYPE_LABELS } from '@/modules/training/learning/types'
import type { ProgramWithModules, LessonType } from '@/modules/training/learning/types'
import {
  Plus, ChevronDown, ChevronRight, GripVertical,
  FileText, Video, Headphones, HelpCircle, ClipboardList,
  Radio, Download, Code, Trash2, BookOpen,
} from 'lucide-react'

const LESSON_ICONS: Record<string, typeof FileText> = {
  text: FileText,
  video: Video,
  audio: Headphones,
  quiz: HelpCircle,
  assignment: ClipboardList,
  live_session: Radio,
  download: Download,
  embed: Code,
}

interface ProgramEditorProps {
  workspaceId: string
  workspaceSlug: string
  productId: string
  programs: ProgramWithModules[]
  canEdit: boolean
}

export function ProgramEditor({ workspaceId, workspaceSlug, productId, programs, canEdit }: ProgramEditorProps) {
  const router = useRouter()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [addingModuleTo, setAddingModuleTo] = useState<string | null>(null)
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleModule(moduleId: string) {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  async function handleCreateProgram(formData: FormData) {
    setLoading(true)
    const result = await createProgram(workspaceId, productId, formData)
    if (result?.error) alert(result.error)
    else { setShowNewProgram(false); router.refresh() }
    setLoading(false)
  }

  async function handleAddModule(programId: string, formData: FormData) {
    setLoading(true)
    const result = await addModule(workspaceId, programId, formData)
    if (result?.error) alert(result.error)
    else { setAddingModuleTo(null); router.refresh() }
    setLoading(false)
  }

  async function handleAddLesson(moduleId: string, formData: FormData) {
    setLoading(true)
    const result = await addLesson(workspaceId, moduleId, formData)
    if (result?.error) alert(result.error)
    else { setAddingLessonTo(null); router.refresh() }
    setLoading(false)
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm('Usunac modul i wszystkie lekcje?')) return
    await removeModule(workspaceId, moduleId)
    router.refresh()
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm('Usunac lekcje?')) return
    await removeLesson(workspaceId, lessonId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {programs.length === 0 && !showNewProgram && (
        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-3">Ten produkt nie ma jeszcze programu nauki</p>
          {canEdit && (
            <Button size="sm" onClick={() => setShowNewProgram(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Utworz program
            </Button>
          )}
        </div>
      )}

      {/* New program form */}
      {showNewProgram && (
        <div className="bg-card border rounded-lg p-4">
          <p className="font-medium mb-3">Nowy program</p>
          <form action={handleCreateProgram} className="flex gap-2">
            <Input name="name" placeholder="Nazwa programu" required className="flex-1" />
            <Button type="submit" disabled={loading}>Utworz</Button>
            <Button type="button" variant="outline" onClick={() => setShowNewProgram(false)}>Anuluj</Button>
          </form>
        </div>
      )}

      {/* Programs */}
      {programs.map((program) => {
        const modules = program.program_modules || []
        const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)

        return (
          <div key={program.id} className="bg-card border rounded-lg">
            {/* Program header */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{program.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {modules.length} modulow - {totalLessons} lekcji
                  </Badge>
                </div>
                {program.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{program.description}</p>
                )}
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setAddingModuleTo(program.id)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Modul
                </Button>
              )}
            </div>

            <Separator />

            {/* Add module form */}
            {addingModuleTo === program.id && (
              <div className="p-4 bg-muted/30">
                <form action={(fd) => handleAddModule(program.id, fd)} className="flex gap-2">
                  <Input name="title" placeholder="Nazwa modulu" required className="flex-1" />
                  <Button type="submit" size="sm" disabled={loading}>Dodaj</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setAddingModuleTo(null)}>Anuluj</Button>
                </form>
              </div>
            )}

            {/* Modules */}
            <div className="divide-y">
              {modules.map((mod) => {
                const lessons = mod.lessons || []
                const isExpanded = expandedModules.has(mod.id)

                return (
                  <div key={mod.id}>
                    {/* Module header */}
                    <div
                      className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleModule(mod.id)}
                    >
                      {canEdit && <GripVertical className="h-4 w-4 text-muted-foreground/50" />}
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium text-sm flex-1">{mod.title}</span>
                      <span className="text-xs text-muted-foreground">{lessons.length} lekcji</span>
                      {canEdit && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon-xs" variant="ghost" onClick={() => setAddingLessonTo(mod.id)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-xs" variant="ghost" onClick={() => handleDeleteModule(mod.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Lessons */}
                    {isExpanded && (
                      <div className="bg-muted/20">
                        {/* Add lesson form */}
                        {addingLessonTo === mod.id && (
                          <div className="px-4 py-3 border-b">
                            <form action={(fd) => handleAddLesson(mod.id, fd)} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Input name="title" placeholder="Tytul lekcji" required />
                              </div>
                              <select name="type" className="h-8 px-2 rounded-md border bg-background text-sm">
                                {(Object.entries(LESSON_TYPE_LABELS) as [LessonType, string][]).map(([val, lbl]) => (
                                  <option key={val} value={val}>{lbl}</option>
                                ))}
                              </select>
                              <Button type="submit" size="sm" disabled={loading}>Dodaj</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setAddingLessonTo(null)}>Anuluj</Button>
                            </form>
                          </div>
                        )}

                        {lessons.length === 0 && addingLessonTo !== mod.id && (
                          <p className="px-12 py-3 text-xs text-muted-foreground">Brak lekcji w tym module</p>
                        )}

                        {lessons.map((lesson) => {
                          const Icon = LESSON_ICONS[lesson.type] || FileText
                          return (
                            <div
                              key={lesson.id}
                              className="px-4 py-2 flex items-center gap-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors group"
                            >
                              {canEdit && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />}
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`/app/${workspaceSlug}/admin/products/${program.product_id}/lessons/${lesson.id}`}
                                className="text-sm flex-1 hover:text-primary transition-colors"
                              >
                                {lesson.title}
                              </a>
                              <div className="flex items-center gap-2">
                                {!lesson.is_published && (
                                  <Badge variant="outline" className="text-xs">Szkic</Badge>
                                )}
                                {lesson.is_free_preview && (
                                  <Badge className="text-xs bg-green-100 text-green-700">Preview</Badge>
                                )}
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                                )}
                                {canEdit && (
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100"
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {modules.length === 0 && addingModuleTo !== program.id && (
              <p className="p-4 text-sm text-muted-foreground text-center">Dodaj pierwszy modul do programu</p>
            )}
          </div>
        )
      })}

      {/* Add another program */}
      {programs.length > 0 && canEdit && !showNewProgram && (
        <Button variant="outline" size="sm" onClick={() => setShowNewProgram(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj kolejny program
        </Button>
      )}
    </div>
  )
}
