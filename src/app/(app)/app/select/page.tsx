import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyWorkspaces } from '@/lib/actions/workspace'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function WorkspaceSelectPage() {
  const workspaces = await getMyWorkspaces()

  if (workspaces.length === 1) {
    const ws = workspaces[0].workspaces as unknown as { slug: string } | null
    if (ws) redirect(`/app/${ws.slug}/dashboard`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Wybierz workspace</h1>
          <p className="text-muted-foreground">Na ktorej platformie chcesz pracowac?</p>
        </div>

        <div className="space-y-2">
          {workspaces.map((item) => {
            const ws = item.workspaces as unknown as {
              id: string; name: string; slug: string; logo_url: string | null; brand_color: string
            } | null
            if (!ws) return null

            return (
              <Link
                key={ws.id}
                href={`/app/${ws.slug}/dashboard`}
                className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:shadow-md transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: ws.brand_color || '#6366f1' }}
                >
                  {ws.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{ws.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.system_role}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <Link href="/app/new" className="block">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Stworz nowy workspace
          </Button>
        </Link>
      </div>
    </div>
  )
}
