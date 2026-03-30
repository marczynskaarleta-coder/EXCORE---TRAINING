import { redirect } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { getRules, getAvailableTemplates, getRecentExecutions } from '@/modules/training/automations/actions'
import { AutomationsManager } from '@/components/training/automations/AutomationsManager'
import { Zap } from 'lucide-react'

export default async function AutomationsPage({
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
  if (!ctx || !hasPermission(ctx, 'settings.manage')) redirect(`/app/${workspaceSlug}/dashboard`)

  const [rules, templates, executions] = await Promise.all([
    getRules(workspace.id),
    getAvailableTemplates(workspace.id),
    getRecentExecutions(workspace.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6" /> Automatyzacje
        </h1>
        <p className="text-muted-foreground">Wlacz gotowe workflow lub tworzwlasne reguly</p>
      </div>

      <AutomationsManager
        workspaceId={workspace.id}
        rules={rules}
        templates={templates as Array<{
          id: string; name: string; description: string; trigger: string; action: string;
          category: string; is_enabled: boolean; delay_minutes: number;
        }>}
        recentExecutions={executions}
      />
    </div>
  )
}
