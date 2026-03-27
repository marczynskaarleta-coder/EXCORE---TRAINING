import { getWorkspaceBySlug } from '@/lib/actions/workspace'
import { getEvents } from '@/lib/actions/events'
import { Calendar, MapPin, Video, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Szkic',
  scheduled: 'Zaplanowane',
  live: 'Na zywo',
  completed: 'Zakonczone',
  cancelled: 'Odwolane',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) return null

  const events = await getEvents(workspace.id)

  const upcoming = events.filter(
    (e: { starts_at: string; status: string }) =>
      new Date(e.starts_at) >= new Date() && e.status !== 'cancelled'
  )
  const past = events.filter(
    (e: { starts_at: string }) => new Date(e.starts_at) < new Date()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Wydarzenia
        </h1>
        <p className="text-muted-foreground">Webinary, warsztaty, spotkania na zywo</p>
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
                {upcoming.map((event: {
                  id: string
                  title: string
                  type: string
                  status: string
                  starts_at: string
                  ends_at: string | null
                  is_online: boolean
                  location_url: string | null
                  location_address: string | null
                  host: { display_name: string } | null
                  event_rsvps: { count: number }[] | null
                }) => (
                  <div key={event.id} className="bg-card border rounded-lg p-4 flex items-start gap-4">
                    <div className="text-center bg-primary/10 rounded-lg p-3 min-w-[60px]">
                      <p className="text-2xl font-bold text-primary">
                        {new Date(event.starts_at).getDate()}
                      </p>
                      <p className="text-xs text-primary uppercase">
                        {new Date(event.starts_at).toLocaleDateString('pl-PL', { month: 'short' })}
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge className={STATUS_COLORS[event.status] || ''}>
                          {STATUS_LABELS[event.status] || event.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(event.starts_at).toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {event.ends_at && ` - ${new Date(event.ends_at).toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                        </span>

                        {event.is_online ? (
                          <span className="flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location_address || 'Stacjonarnie'}
                          </span>
                        )}

                        {event.host && (
                          <span>Prowadzacy: {event.host.display_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Przeszle</h2>
              <div className="space-y-2 opacity-60">
                {past.slice(0, 5).map((event: {
                  id: string; title: string; starts_at: string; type: string
                }) => (
                  <div key={event.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
                    <p className="text-sm text-muted-foreground w-24">
                      {new Date(event.starts_at).toLocaleDateString('pl-PL')}
                    </p>
                    <p className="text-sm">{event.title}</p>
                    <Badge variant="outline" className="text-xs ml-auto">{event.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
