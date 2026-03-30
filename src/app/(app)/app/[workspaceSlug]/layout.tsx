import { redirect } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { Sidebar } from '@/components/shared/layout/sidebar'
import { Header } from '@/components/shared/layout/header'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)

  if (!workspace) {
    redirect('/app/select')
  }

  const member = await getWorkspaceMember(workspace.id)

  if (!member) {
    redirect('/app/select')
  }

  const enabledModules = (workspace.workspace_modules || [])
    .filter((m: { enabled: boolean }) => m.enabled)
    .map((m: { module: string }) => m.module)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        enabledModules={enabledModules}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          displayName={member.display_name || 'Uzytkownik'}
          avatarUrl={member.avatar_url}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
