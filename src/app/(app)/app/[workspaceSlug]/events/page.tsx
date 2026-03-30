import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getWorkspaceBySlug, getWorkspaceMember } from '@/modules/shared/workspace/actions'
import { getAccessibleEvents } from '@/modules/training/events/actions'
import { buildAccessContext, hasPermission } from '@/modules/shared/access'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from '@/modules/training/events/types'
import type { EventStatus, EventType } from '@/modules/training/events/types'
import { Calendar, MapPin, Video, Clock, Plus, Play } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) redirect('/app/select')
  const member = await getWorkspaceMember(workspace.id)
  if (!member) redirect('/app/select')

  const events = await getAccessibleEvents(workspace.id, member.user_id)
  const ctx = await buildAccessContext(workspace.id, member.user_id)
  const canCreate = ctx && hasPermission(ctx, 'event.create')

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.starts_at) >= now && e.status !== 'cancelled')
  const past = events.filter(e => new Date(e.starts_at) < now || e.status === 'completed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" /> Wydarzenia
        </h1>
        {canCreate && (
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-1" /> Nowe wydarzenie
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">Brak wydarzen</h3>
          <p className="text-muted-foreground">Nie zaplanowano jeszcze zadnych wydarzen.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Nadchodzace</h2>
              <div className="space-y-3">
                {upcoming.map((event) => {
                  const regCount = event.event_registrations?.[0]?.count || 0
                  return (
                    <Link key={event.id} href={`/app/${workspaceSlug}/events/${event.id}`}
                      className="bg-card border rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow block">
                      <div className="text-center bg-primary/10 rounded-lg p-3 min-w-[60px]">
                        <p className="text-2xl font-bold text-primary">{new Date(event.starts_at).getDate()}</p>
                        <p className="text-xs text-primary uppercase">{new Date(event.starts_at).toLocaleDateString('pl-PL', { month: 'short' })}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{event.title}</h3>
                          <Badge className={STATUS_COLORS[event.status] || ''}>{EVENT_STATUS_LABELS[event.status as EventStatus]}</Badge>
                          <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[event.type as EventType]}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(event.starts_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {event.meeting_url
                            ? <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Online</span>
                            : event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>
                          }
                          <span>{regCount} zarejestrowanych{event.capacity ? `/${event.capacity}` : ''}</span>
                          {event.host?.display_name && <span>Host: {event.host.display_name}</span>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Przeszle</h2>
              <div className="space-y-2 opacity-70">
                {past.slice(0, 10).map((event) => (
                  <Link key={event.id} href={`/app/${workspaceSlug}/events/${event.id}`}
                    className="bg-card border rounded-lg p-3 flex items-center gap-3 hover:opacity-100 transition-opacity block">
                    <p className="text-sm text-muted-foreground w-24">{new Date(event.starts_at).toLocaleDateString('pl-PL')}</p>
                    <p className="text-sm flex-1">{event.title}</p>
                    {event.replay_url && (
                      <Badge variant="outline" className="text-xs"><Play className="h-3 w-3 mr-1" /> Replay</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[event.type as EventType]}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
