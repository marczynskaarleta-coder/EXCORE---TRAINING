import { getWorkspaceBySlug, getWorkspaceMember } from '@/lib/actions/workspace'
import { getMyEnrollments } from '@/lib/actions/products'
import { getUpcomingEvents } from '@/lib/actions/events'
import { getUnreadCount } from '@/lib/actions/notifications'
import { BookOpen, Calendar, Bell, TrendingUp } from 'lucide-react'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) return null

  const member = await getWorkspaceMember(workspace.id)
  if (!member) return null

  const [enrollments, events, unreadCount] = await Promise.all([
    getMyEnrollments(workspace.id, member.id),
    getUpcomingEvents(workspace.id, 3),
    getUnreadCount(member.id),
  ])

  const activeEnrollments = enrollments.filter((e: { status: string }) => e.status === 'active')
  const completedEnrollments = enrollments.filter((e: { status: string }) => e.status === 'completed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Czesc, {member.display_name || 'Uzytkowniku'}!
        </h1>
        <p className="text-muted-foreground">
          Oto co dzisiaj na Ciebie czeka.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{activeEnrollments.length}</p>
            <p className="text-sm text-muted-foreground">Aktywne kursy</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completedEnrollments.length}</p>
            <p className="text-sm text-muted-foreground">Ukonczone</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{events.length}</p>
            <p className="text-sm text-muted-foreground">Nadchodzace wydarzenia</p>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{unreadCount}</p>
            <p className="text-sm text-muted-foreground">Nieprzeczytane</p>
          </div>
        </div>
      </div>

      {/* Continue learning */}
      {activeEnrollments.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Kontynuuj nauke</h2>
          <div className="space-y-3">
            {activeEnrollments.map((enrollment: {
              id: string
              progress_percent: number
              products: { title: string; slug: string; type: string } | null
            }) => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 bg-background rounded-md">
                <div>
                  <p className="font-medium">{enrollment.products?.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">{enrollment.products?.type?.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${enrollment.progress_percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{enrollment.progress_percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Nadchodzace wydarzenia</h2>
          <div className="space-y-3">
            {events.map((event: {
              id: string
              title: string
              type: string
              starts_at: string
              host: { display_name: string } | null
            }) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-background rounded-md">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.starts_at).toLocaleDateString('pl-PL', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {event.host && ` / ${event.host.display_name}`}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-muted rounded capitalize">
                  {event.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
