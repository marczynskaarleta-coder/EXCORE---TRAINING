import { getWorkspaceBySlug } from '@/lib/actions/workspace'
import { createClient } from '@/lib/supabase/server'
import { FolderOpen, FileText, Download, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TYPE_ICONS: Record<string, string> = {
  pdf: 'PDF',
  template: 'TPL',
  workbook: 'WB',
  checklist: 'CHL',
  sop: 'SOP',
  recording: 'REC',
  video: 'VID',
  audio: 'AUD',
  link: 'LNK',
  other: 'DOC',
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) return null

  const supabase = await createClient()
  const { data: resources } = await supabase
    .from('resources')
    .select(`
      *,
      resource_tags (tag_id, tags (name, color))
    `)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-6 w-6" />
          Zasoby
        </h1>
        <p className="text-muted-foreground">Materialy, szablony, nagrania do pobrania</p>
      </div>

      {!resources || resources.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">Brak zasobow</h3>
          <p className="text-muted-foreground">Nie dodano jeszcze zadnych materialow.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource: {
            id: string
            title: string
            description: string | null
            type: string
            file_url: string | null
            external_url: string | null
            file_size: number | null
            download_count: number
            is_premium: boolean
            resource_tags: Array<{ tags: { name: string; color: string } }>
          }) => (
            <div key={resource.id} className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {TYPE_ICONS[resource.type] || 'DOC'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
                  )}
                </div>
              </div>

              {resource.resource_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {resource.resource_tags.map((rt, i) => (
                    <Badge key={i} variant="outline" className="text-xs" style={{ borderColor: rt.tags.color }}>
                      {rt.tags.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{resource.download_count} pobran</span>
                {resource.file_url ? (
                  <a href={resource.file_url} className="flex items-center gap-1 text-primary hover:underline">
                    <Download className="h-3 w-3" /> Pobierz
                  </a>
                ) : resource.external_url ? (
                  <a href={resource.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Otworz
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
